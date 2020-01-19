using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;

namespace Scaler {

    static class Env {
        public static readonly int MaxAgents;
        public static readonly int JobsPerAgent;

        public static readonly string DroneUrl;
        public static readonly string DroneToken;

        public static readonly string AwsRegion;
        public static readonly string AwsAccessKey;
        public static readonly string AwsSecretKey;

        static Env() {
            var config = JsonConvert.DeserializeObject<IDictionary<string, string>>(
                File.ReadAllText("config.json")
            );

            MaxAgents = Convert.ToInt32(config["SCALER_MAX_AGENTS"]);
            JobsPerAgent = Convert.ToInt32(config["SCALER_JOBS_PER_AGENT"]);

            DroneUrl = config["SCALER_DRONE_URL"];
            DroneToken = config["SCALER_DRONE_TOKEN"];

            AwsRegion = config["SCALER_AWS_REGION"];
            AwsAccessKey = config["SCALER_AWS_ACCES_KEY"];
            AwsSecretKey = config["SCALER_AWS_SECRET_KEY"];
        }
    }

}
