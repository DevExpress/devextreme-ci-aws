using System;
using System.Collections.Generic;
using System.Text;

namespace Scaler {

    static class Env {
        public static int MaxAgents => Convert.ToInt32(Read("SCALER_MAX_AGENTS"));
        public static int JobsPerAgent => Convert.ToInt32(Read("SCALER_JOBS_PER_AGENT"));

        public static string DroneUrl => Read("SCALER_DRONE_URL");
        public static string DroneToken => Read("SCALER_DRONE_TOKEN");

        public static string AwsRegion => Read("SCALER_AWS_REGION");
        public static string AwsAccessKey => Read("SCALER_AWS_ACCES_KEY");
        public static string AwsSecretKey => Read("SCALER_AWS_SECRET_KEY");

        static string Read(string key) {
            var value = Environment.GetEnvironmentVariable(key);
            if(String.IsNullOrEmpty(value))
                throw new ArgumentException($"Environment variable '{key}' is not defined");

            return value;
        }
    }

}
