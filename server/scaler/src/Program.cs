using Amazon.AutoScaling.Model;
using Amazon.EC2;
using Amazon.EC2.Model;
using Amazon.Runtime;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

using EC2Filter = Amazon.EC2.Model.Filter;
using EC2Instance = Amazon.EC2.Model.Instance;

namespace Scaler {

    class Program {
        const string
            SCALING_GROUP_TAG = "aws:autoscaling:groupName",
            SCALING_GROUP_NAME = "devextreme-ci-agent-scaling";

        const string
            AGENT_TAG_NAME = "Role",
            AGENT_TAG_VALUE = "devextreme-ci-agent";

        const string SHUTDOWN_SCRIPT = ""
            + "[ ! -f /devextreme-ci-shutdown ] && ("
            + "  touch /devextreme-ci-shutdown; "
            + "  ("
            + "    docker kill -s SIGINT drone-agent; "
            + "    docker wait drone-agent; "
            + "    docker rm -f drone-agent; "
            + "    shutdown -h now"
            + "  ) &"
            + ")";

        const string CONTAINER_COUNT_SCRIPT = "docker ps -q | wc -l; exit ${PIPESTATUS[0]}";

        const int PAUSE_SECONDS = 5;

        static readonly TimeSpan CONTAINER_COUNT_CHECK_INTERVAL = TimeSpan.FromMinutes(1);
        static DateTime LastContainerCountCheck = DateTime.MinValue;

        static void Main(string[] args) {
            var droneApi = new DroneApi(Env.DroneUrl, Env.DroneToken);
            var lastDroneApiSuccess = DateTime.MinValue;
            var allAgentsAreTerminated = false;

            while(true) {
                var droneQueue = new DroneQueue();

                try {
                    droneQueue = droneApi.ReadQueue();
                    lastDroneApiSuccess = DateTime.Now;
                } catch(Exception x) {
                    PrintError(x);

                    if(DateTime.Now - lastDroneApiSuccess < TimeSpan.FromMinutes(5)) {
                        Console.WriteLine("  Will retry");
                        PauseWithDots();
                        continue;
                    } else {
                        Console.WriteLine("  Assuming queue is empty");
                    }
                }

                // FYI https://github.com/drone/drone/issues/2189
                foreach(var b in droneQueue.ZombieBuilds)
                    Kill(b, "zombie");

                // https://github.com/drone/drone/issues/2484
                foreach(var b in droneQueue.CancelledBuilds)
                    Kill(b, "cancelled");

                void Kill(DroneBuild b, string reason) {
                    try {
                        droneApi.KillBuild(b, reason);
                    } catch(Exception x) {
                        PrintError(x);
                    }
                }

                var desiredAgentCount = Math.Min(
                    (int)Math.Ceiling((double)droneQueue.ActiveJobCount / Env.JobsPerAgent),
                    Env.MaxAgents
                );

                Console.WriteLine("Active jobs: " + droneQueue.ActiveJobCount);
                Console.WriteLine("Desired agents: " + desiredAgentCount);

                if(desiredAgentCount > 0 || !allAgentsAreTerminated)
                    AdjustAgentCount(desiredAgentCount, out allAgentsAreTerminated);
                else
                    Console.WriteLine("Do nothing");

                PauseWithDots();
            }
        }

        static void AdjustAgentCount(int desiredCount, out bool allAgentsAreTerminated) {
            allAgentsAreTerminated = false;
            using(var aws = new MyAWS(Env.AwsRegion, Env.AwsAccessKey, Env.AwsSecretKey)) {
                if(TryScaleOut(aws, desiredCount))
                    return;

                var allAgents = TryReadInstancesByTag(aws, AGENT_TAG_NAME, AGENT_TAG_VALUE);
                Console.WriteLine("Total agents: " + allAgents.Length);

                allAgentsAreTerminated = allAgents.All(i => i.State.Name == InstanceStateName.Terminated);

                if(!allAgentsAreTerminated) {
                    AgentDiskUsageMonitor.Measure(aws, allAgents);

                    TryTerminate(aws, "stopped", allAgents.Where(i => i.State.Name == InstanceStateName.Stopped));
                    TryShutdownExcessiveRunning(aws, allAgents, desiredCount);

                    TryTerminate(aws, "lost", allAgents.Where(i => i.State.Name == InstanceStateName.Running && DateTime.Now - i.LaunchTime > TimeSpan.FromHours(12)));
                } else {
                    Console.WriteLine("All agents are terminated");
                }
            }
        }

        static bool TryScaleOut(MyAWS aws, int desiredCapacity) {
            try {
                Console.WriteLine($"Read auto scaling group '{SCALING_GROUP_NAME}'");

                var group = aws.Scaling.DescribeAutoScalingGroupsAsync(new DescribeAutoScalingGroupsRequest {
                    AutoScalingGroupNames = new List<string> { SCALING_GROUP_NAME },
                }).GetAwaiter().GetResult().AutoScalingGroups.Single();

                Console.WriteLine($"Current capacity: {group.DesiredCapacity} of {Env.MaxAgents}");

                if(group.DesiredCapacity >= desiredCapacity)
                    return false;

                Console.WriteLine("New capacity: " + desiredCapacity);

                var response = aws.Scaling.UpdateAutoScalingGroupAsync(new UpdateAutoScalingGroupRequest {
                    AutoScalingGroupName = SCALING_GROUP_NAME,
                    MinSize = 0,
                    MaxSize = Env.MaxAgents,
                    DesiredCapacity = desiredCapacity
                }).GetAwaiter().GetResult();
                PrintStatus(response);
                return true;

            } catch(Exception x) {
                PrintError(x);
                return false;
            }
        }

        static EC2Instance[] TryReadInstancesByTag(MyAWS aws, string tagName, string tagValue) {
            Console.WriteLine($"Read instances by tag {tagName}={tagValue}");

            var filters = new List<EC2Filter> {
                new EC2Filter {
                    Name = "tag:" + tagName,
                    Values = new List<string> { tagValue }
                }
            };

            try {
                return aws.EC2.DescribeInstancesAsync(new DescribeInstancesRequest { Filters = filters })
                    .GetAwaiter().GetResult()
                    .Reservations
                    .SelectMany(r => r.Instances)
                    .ToArray();
            } catch(Exception x) {
                PrintError(x);
                Console.WriteLine("  Assuming no instances");
                return new EC2Instance[0];
            }
        }

        static void TryShutdownExcessiveRunning(MyAWS aws, EC2Instance[] allAgents, int desiredCount) {
            var sortedRunningAgents = allAgents
                .Where(i => i.State.Name == InstanceStateName.Running)
                .OrderBy(i => i.LaunchTime)
                .ThenBy(i => i.InstanceId)
                .Select(i => new AgentInfo(
                    i.InstanceId,
                    i.LaunchTime,
                    i.Tags.Any(t => t.Key == SCALING_GROUP_TAG && t.Value == SCALING_GROUP_NAME)
                ))
                .ToArray();

            Console.WriteLine("Running agents: " + sortedRunningAgents.Length);

            if(!sortedRunningAgents.Any())
                return;

            if(sortedRunningAgents.All(a => a.Retain)) {
                Console.WriteLine("Retain all agents");
                return;
            }

            if(sortedRunningAgents.Length > desiredCount) {
                if(DateTime.Now - LastContainerCountCheck > CONTAINER_COUNT_CHECK_INTERVAL) {
                    LastContainerCountCheck = DateTime.Now;

                    var containerCounts = ReadContainerCount(aws, sortedRunningAgents
                        .Where(a => !a.Retain)
                        .Select(a => a.InstanceId)
                        .ToList()
                    );

                    foreach(var a in sortedRunningAgents) {
                        if(containerCounts.ContainsKey(a.InstanceId))
                            a.SetContainerCount(containerCounts[a.InstanceId]);
                    }
                } else {
                    Console.WriteLine("Delay container count check");
                }
            } else {
                Console.WriteLine("Skip container count check");
            }

            foreach(var a in sortedRunningAgents) {
                Console.Write("  ");
                Console.WriteLine(a);
            }

            var idsToCheckStatus = sortedRunningAgents.Where(a => a.WillCheckStatus).Select(a => a.InstanceId).ToList();
            var idsToSendShutdownScript = sortedRunningAgents.Where(a => a.WillShutdown).Select(a => a.InstanceId).ToList();
            var idsToDetach = sortedRunningAgents.Where(a => a.WillDetach).Select(a => a.InstanceId).ToList();

            if(idsToCheckStatus.Any()) {
                var unreachableIds = FindUnreachable(aws, idsToCheckStatus);
                if(unreachableIds.Any()) {
                    Console.WriteLine("Unreachable agents detected!");
                    idsToSendShutdownScript = idsToSendShutdownScript.Except(unreachableIds).ToList();
                    idsToDetach = idsToDetach.Except(unreachableIds).ToList();
                    TryTerminate(aws, "unreachable", unreachableIds);
                }
            }

            if(idsToSendShutdownScript.Any())
                TrySendShutdownScript(aws, idsToSendShutdownScript);

            if(idsToDetach.Any())
                TryDetachFromAutoScalingGroup(aws, idsToDetach);
        }

        static void TrySendShutdownScript(MyAWS aws, List<string> ids) {
            Console.WriteLine($"Send shutdown script to {ids.Count} instances");
            try {
                aws.RunShellScriptAsync(ids, SHUTDOWN_SCRIPT, false).GetAwaiter().GetResult();
            } catch(Exception x) {
                PrintError(x);
            }
        }

        static IDictionary<string, int> ReadContainerCount(MyAWS aws, List<string> ids) {
            if(!ids.Any())
                throw new ArgumentException("Don't call me with empty list");

            Console.WriteLine($"Read running container count from {ids.Count} instances");

            var result = new Dictionary<string, int>();
            try {
                foreach(var pair in aws.RunShellScriptAsync(ids, CONTAINER_COUNT_SCRIPT, true).GetAwaiter().GetResult()) {
                    try {
                        result[pair.Key] = Convert.ToInt32(pair.Value.Trim());
                    } catch(Exception x) {
                        PrintError(x);
                    }
                }
            } catch(Exception x) {
                PrintError(x);
            }
            return result;
        }

        static void TryDetachFromAutoScalingGroup(MyAWS aws, List<string> ids) {
            Console.WriteLine($"Detach {ids.Count} instances from {SCALING_GROUP_NAME}");
            try {
                var detachResponse = aws.Scaling.DetachInstancesAsync(new DetachInstancesRequest {
                    AutoScalingGroupName = SCALING_GROUP_NAME,
                    InstanceIds = ids,
                    ShouldDecrementDesiredCapacity = true
                }).GetAwaiter().GetResult();
                PrintStatus(detachResponse);
            } catch(Exception x) {
                PrintError(x);
            }
        }

        static void TryTerminate(MyAWS aws, string adjective, IEnumerable<EC2Instance> query) {
            TryTerminate(aws, adjective, query.Select(i => i.InstanceId).ToList());
        }

        static void TryTerminate(MyAWS aws, string adjective, List<string> ids) {
            if(!ids.Any())
                return;

            Console.WriteLine($"Terminate {ids.Count} {adjective} agents");

            try {
                var response = aws.EC2.TerminateInstancesAsync(new TerminateInstancesRequest {
                    InstanceIds = ids
                }).GetAwaiter().GetResult();
                PrintStatus(response);
            } catch(Exception x) {
                PrintError(x);
            }
        }

        static List<string> FindUnreachable(MyAWS aws, List<string> ids) {
            try {
                Console.WriteLine("Read agent statuses");
                var statusResponse = aws.EC2
                    .DescribeInstanceStatusAsync(new DescribeInstanceStatusRequest {
                        InstanceIds = ids
                    }).GetAwaiter().GetResult();

                PrintStatus(statusResponse);

                return statusResponse.InstanceStatuses
                    .Where(s => s.Status.Details.Any(d => d.Name == StatusName.Reachability
                        && d.Status == StatusType.Failed
                        && DateTime.Now - d.ImpairedSince > Env.AGENT_REACHABILITY_ALARM_THRESHOLD))
                    .Select(i => i.InstanceId)
                    .ToList();
            } catch(Exception x) {
                PrintError(x);
                return new List<string>();
            }
        }

        static void PauseWithDots() {
            for(var i = 0; i < PAUSE_SECONDS; i++) {
                Console.Write(".");
                Thread.Sleep(TimeSpan.FromSeconds(1));
            }
            Console.WriteLine();
        }

        static void PrintStatus(AmazonWebServiceResponse response) {
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("  Status " + response.HttpStatusCode);
            Console.ResetColor();
        }

        static void PrintError(Exception x) {
            Console.BackgroundColor = ConsoleColor.DarkRed;
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("  ERROR!");
            Console.WriteLine("  " + x.Message);
            Console.ResetColor();
        }
    }
}
