using Amazon;
using Amazon.AutoScaling;
using Amazon.EC2;
using Amazon.Runtime;
using Amazon.SimpleSystemsManagement;
using System;

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
    }

}
