using Amazon.AutoScaling.Model;
using Amazon.EC2;
using Amazon.EC2.Model;
using Amazon.Runtime;
using Amazon.SimpleSystemsManagement.Model;
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

        const int PAUSE_SECONDS = 5;
        const int MIN_AGENT_UPTIME_MINUTES = 5;
        const int REACHABILITY_ALARM_THRESHOLD_MINUTES = 10;

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
                foreach(var b in droneQueue.ZombieBuilds) {
                    try {
                        droneApi.ZombieKill(b);
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
                .ToArray();

            Console.WriteLine("Running agents: " + sortedRunningAgents.Length);

            var excess = Math.Max(0, sortedRunningAgents.Length - desiredCount);
            var idsToSendShutdownScript = new List<string>();
            var idsToDetach = new List<string>();
            var idsToCheckStatus = new List<string>();

            foreach(var i in sortedRunningAgents) {
                var uptime = TimeSpan.FromSeconds(Math.Round((DateTime.Now - i.LaunchTime).TotalSeconds));
                var retain = uptime < TimeSpan.FromMinutes(MIN_AGENT_UPTIME_MINUTES);
                var attached = i.Tags.Any(t => t.Key == SCALING_GROUP_TAG && t.Value == SCALING_GROUP_NAME);
                var checkStatus = uptime > TimeSpan.FromMinutes(REACHABILITY_ALARM_THRESHOLD_MINUTES);

                Console.Write($"  {i.InstanceId} up for {uptime}");
                if(retain)
                    Console.Write(" [retain]");
                if(!attached)
                    Console.Write(" [detached]");

                if(checkStatus) {
                    Console.Write(" [will check status]");
                    idsToCheckStatus.Add(i.InstanceId);
                }

                if(excess > 0 && !retain) {
                    Console.Write(" [will shutdown]");
                    idsToSendShutdownScript.Add(i.InstanceId);

                    if(attached) {
                        Console.Write(" [will detach]");
                        idsToDetach.Add(i.InstanceId);
                    }

                    excess--;
                }

                Console.WriteLine();
            }

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
                var ssmResponse = aws.SSM.SendCommandAsync(new SendCommandRequest {
                    InstanceIds = ids,
                    DocumentName = "AWS-RunShellScript",
                    Parameters = new Dictionary<string, List<string>> {
                        ["commands"] = new List<string> { SHUTDOWN_SCRIPT }
                    }
                }).GetAwaiter().GetResult();
                PrintStatus(ssmResponse);
            } catch(Exception x) {
                PrintError(x);
            }
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
                        && DateTime.Now - d.ImpairedSince > TimeSpan.FromMinutes(REACHABILITY_ALARM_THRESHOLD_MINUTES)))
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
            Console.WriteLine("  Status " + response.HttpStatusCode);
        }

        static void PrintError(Exception x) {
            Console.WriteLine("  ERROR!");
            Console.WriteLine("  " + x.Message);
        }
    }
}
