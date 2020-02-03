using System;
using System.Text;

namespace Scaler {

    class AgentInfo {
        public readonly string InstanceId;
        public readonly TimeSpan Uptime;
        public readonly bool Attached;

        public AgentInfo(string instanceId, DateTime launchTime, bool attached) {
            InstanceId = instanceId;
            Uptime = TimeSpan.FromSeconds(Math.Round((DateTime.Now - launchTime).TotalSeconds));
            Attached = attached;
        }

        public int? ContainerCount { get; private set; }

        public bool Retain => Uptime < Env.AGENT_MIN_UPTIME;

        public bool WillCheckStatus => Uptime > Env.AGENT_REACHABILITY_ALARM_THRESHOLD;

        public bool WillShutdown => !Retain && ContainerCount <= 1;

        public bool WillDetach => Attached && WillShutdown;

        public void SetContainerCount(int value) {
            ContainerCount = value;
        }

        public override string ToString() {
            var builder = new StringBuilder()
                .Append(InstanceId)
                .Append(" up for ")
                .Append(Uptime);

            builder
                .Append(" [")
                .Append(Convert.ToString(ContainerCount).PadLeft(2))
                .Append("]");

            if(WillCheckStatus)
                builder.Append(" [will check status]");

            if(Retain)
                builder.Append(" [retain]");

            if(!Attached)
                builder.Append(" [detached]");

            if(WillShutdown)
                builder.Append(" [will shutdown]");

            if(WillDetach)
                builder.Append(" [will detach]");

            return builder.ToString();
        }
    }

}
