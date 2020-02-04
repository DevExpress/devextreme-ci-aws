using Amazon.EC2;
using Amazon.EC2.Model;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Scaler {

    static class AgentDiskUsageMonitor {
        const string STATE_FILE = nameof(AgentDiskUsageMonitor) + ".txt";

        public static readonly bool ENABLED = false;

        static double MaxUsed;

        static AgentDiskUsageMonitor() {
            if(ENABLED && File.Exists(STATE_FILE))
                MaxUsed = Convert.ToDouble(File.ReadAllText(STATE_FILE));
        }

        public static void Measure(MyAWS aws, IEnumerable<Instance> instances) {
            if(!ENABLED)
                return;

            var ids = instances
                .Where(i => i.State.Name == InstanceStateName.Running)
                .Where(i => (DateTime.Now - i.LaunchTime).TotalMinutes > 1)
                .Select(i => i.InstanceId)
                .ToList();

            if(!ids.Any())
                return;

            try {
                var outputs = aws.RunShellScriptAsync(
                    ids,
                    "df -BM --output=used /dev/nvme0n1p1",
                    true
                ).GetAwaiter().GetResult();

                foreach(var output in outputs.Values) {
                    var used = 0.001 * Convert.ToInt32(output.Split('\n')[1].TrimEnd('M'));
                    MaxUsed = Math.Max(MaxUsed, used);
                }
            } catch {
                return;
            }

            File.WriteAllText(STATE_FILE, MaxUsed.ToString());

            Console.BackgroundColor = ConsoleColor.Yellow;
            Console.ForegroundColor = ConsoleColor.Black;
            Console.WriteLine($"Max agent disk usage: {MaxUsed} G");
            Console.ResetColor();
        }

    }

}
