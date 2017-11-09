using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;

namespace Scaler {

    class DroneBuild {
        public string Repo;
        public int Number;
    }

    class DroneQueue {
        public int ActiveJobCount;
        public ICollection<DroneBuild> ZombieBuilds = new List<DroneBuild>();
    }

    class DroneApi {
        readonly string _url, _token;

        public DroneApi(string url, string token) {
            _url = url;
            _token = token;
        }

        public DroneQueue ReadQueue() {
            // FYI https://github.com/drone/drone/issues/2251

            var result = new DroneQueue();

            using(var web = new WebClient()) {
                Console.WriteLine("Reading Drone jobs");

                foreach(var b in ReadBuilds(web)) {
                    Console.Write($"  {b.owner}/{b.name} #{b.number} ");

                    var zombie = true;
                    foreach(var p in ReadBuildDetails(web, b).procs) {
                        Console.Write(((string)p.state)[0]);
                        if(p.state == "running" || p.state == "pending") {
                            result.ActiveJobCount++;
                            zombie = false;
                        }
                    }

                    if(zombie) {
                        Console.Write(" [zombie]");
                        result.ZombieBuilds.Add(new DroneBuild {
                            Repo = b.owner + "/" + b.name,
                            Number = (int)b.number
                        });
                    }

                    Console.WriteLine();
                }
            }

            return result;
        }

        public void ZombieKill(DroneBuild build) {
            Console.WriteLine($"Kill zombie build {build.Repo} #{build.Number}");
            using(var web = new WebClient()) {
                var url = $"{_url}/api/repos/{build.Repo}/builds/{build.Number}?access_token={WebUtility.UrlEncode(_token)}";
                web.UploadString(url, "DELETE", "");
            }
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
