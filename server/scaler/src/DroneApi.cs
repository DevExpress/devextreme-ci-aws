using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;

namespace Scaler {

    class DroneBuild {
        public string Repo;
        public int Number;

        public static DroneBuild FromApiObject(dynamic b) => new DroneBuild {
            Repo = b.owner + "/" + b.name,
            Number = (int)b.number
        };
    }

    class DroneQueue {
        public int ActiveJobCount;
        public ICollection<DroneBuild> ZombieBuilds = new List<DroneBuild>();
        public ICollection<DroneBuild> CancelledBuilds = new List<DroneBuild>();
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

                    var createdAt = DateTimeOffset.FromUnixTimeSeconds((long)b.created_at);
                    if((DateTime.UtcNow - createdAt).TotalHours > 6) {
                        Console.WriteLine($"too old, created at {createdAt:u}");
                        // Don't count too old builds
                        // They may be abnormal queue items that are never picked up by an agent
                        continue;
                    }

                    var zombie = true;
                    var procs = ReadBuildDetails(web, b).procs as IEnumerable<dynamic>;
                    if(procs != null) {
                        var hasCancelledProc = procs.Any(p => p.state == "killed" || p.state == "failure" && p.error == "Cancelled");
                        if(hasCancelledProc) {
                            Console.WriteLine("has killed or cancelled proc");
                            result.CancelledBuilds.Add(DroneBuild.FromApiObject(b));
                            continue;
                        }

                        foreach(var p in procs) {
                            Console.Write(((string)p.state)[0]);
                            if(p.state == "running" || p.state == "pending") {
                                result.ActiveJobCount++;
                                zombie = false;
                            }
                        }
                    } else {
                        Console.Write("no procs!");
                        zombie = false; // TODO
                    }

                    if(zombie) {
                        Console.Write(" [zombie]");
                        result.ZombieBuilds.Add(DroneBuild.FromApiObject(b));
                    }

                    Console.WriteLine();
                }
            }

            return result;
        }

        // TODO rename to Black Mamba?
        public void KillBuild(DroneBuild build, string reason) {
            Console.WriteLine($"Kill {reason} build {build.Repo} #{build.Number}");
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
