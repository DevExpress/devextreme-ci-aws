using Amazon;
using Amazon.AutoScaling;
using Amazon.EC2;
using Amazon.Runtime;
using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Scaler {

    class MyAWS : IDisposable {
        public readonly AmazonAutoScalingClient Scaling;
        public readonly AmazonEC2Client EC2;
        public readonly AmazonSimpleSystemsManagementClient SSM;

        public MyAWS(string region, string accessKey, string secretKey) {
            var regionObj = RegionEndpoint.GetBySystemName(region);

            if(regionObj.DisplayName == "Unknown")
                throw new ArgumentOutOfRangeException(nameof(region));

            var cred = new BasicAWSCredentials(accessKey, secretKey);

            Scaling = new AmazonAutoScalingClient(cred, regionObj);
            EC2 = new AmazonEC2Client(cred, regionObj);
            SSM = new AmazonSimpleSystemsManagementClient(cred, regionObj);
        }

        public void Dispose() {
            Scaling.Dispose();
            EC2.Dispose();
            SSM.Dispose();
        }

        public async Task<IDictionary<string, string>> RunShellScriptAsync(List<string> ids, string script, bool returnOutput) {
            var sendResponse = await SSM.SendCommandAsync(new SendCommandRequest {
                InstanceIds = ids,
                DocumentName = "AWS-RunShellScript",
                Parameters = new Dictionary<string, List<string>> {
                    ["commands"] = new List<string> { script }
                },
                MaxConcurrency = "100%",
                MaxErrors = "100%"
            });

            if(!returnOutput)
                return null;

            return await WaitForCommandOutputsAsync(sendResponse.Command.CommandId, ids.Count);
        }

        async Task<IDictionary<string, string>> WaitForCommandOutputsAsync(string commandId, int instanceCount) {
            var result = new Dictionary<string, string>();
            var startedAt = DateTime.Now;

            while(result.Count < instanceCount) {
                Thread.Sleep(1000);

                if((DateTime.Now - startedAt).TotalSeconds > 5)
                    break;

                var invocationsResponse = await SSM.ListCommandInvocationsAsync(new ListCommandInvocationsRequest {
                    CommandId = commandId,
                    Details = true
                });

                foreach(var invocation in invocationsResponse.CommandInvocations) {
                    var status = invocation.Status;

                    if(status == CommandStatus.Success) {
                        result[invocation.InstanceId] = invocation.CommandPlugins.Single().Output;
                    } else if(status == CommandStatus.Failed || status == CommandStatus.TimedOut) {
                        instanceCount--;
                    }
                }
            }

            return result;
        }
    }

}
