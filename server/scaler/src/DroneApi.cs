using Newtonsoft.Json;
using System;
using System.Net;

namespace Scaler {

     class DroneApi {
        readonly string _url, _token;

        public DroneApi(string url, string token) {
            _url = url;
            _token = token;
        }

        public int ReadActiveDroneJobCount() {
            // FYI https://github.com/drone/drone/issues/2251

            var result = 0;

            using(var web = new WebClient()) {
                Console.WriteLine("Reading Drone jobs");

                foreach(var b in ReadBuilds(web)) {
                    Console.Write($"  {b.owner}/{b.name} #{b.number} ");

                    foreach(var p in ReadBuildDetails(web, b).procs) {
                        Console.Write(((string)p.state)[0]);
                        if(p.state == "running" || p.state == "pending")
                            result++;
                    }

                    Console.WriteLine();
                }
            }

            return result;
        }

        dynamic ReadBuilds(WebClient web) {
            var buildsUrl = $"{_url}/api/builds?access_token={WebUtility.UrlEncode(_token)}";
            return JsonConvert.DeserializeObject(web.DownloadString(buildsUrl));
        }

        dynamic ReadBuildDetails(WebClient web, dynamic build) {
            var buildUrl = $"{_url}/api/repos/{build.owner}/{build.name}/builds/{build.number}?access_token={WebUtility.UrlEncode(_token)}";
            return JsonConvert.DeserializeObject(web.DownloadString(buildUrl));
        }

    }

}
