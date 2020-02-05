## Launch Configuration

- Use a custom image described in [agent-image.md](agent-image.md)
- C5 instance type
- Name: `devextreme-ci-agent-lc-[VERSION]`
- Spot instances, bid at on-demand price
- IAM: `devextreme-ci-agent-iam` (read [this](https://web.archive.org/web/20171108183210/https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-access.html#sysman-access-user))
- User data: [agent-user-data.sh](agent-user-data.sh) (**make sure secrets are filled!**)
- Assign a public IP address to every instance
- Magnetic (explanation below). Size based on stats (table below).
- Security group: [`devextreme-ci-sg-agent`](../security-groups.md)

## Auto Scaling Group
- Group name: `devextreme-ci-agent-scaling`
- Group size: Start with **0** instances
- Network:
    - default VPC
    - all subnets
- Instance Protection: **Protect From Scale In**
- No auto scaling
- No notifications
- Tags:
    - `Product=devextreme-ci`
    - `Role=devextreme-ci-agent`
    
## EBS: Magnetic vs General Purpose SSD
- https://stackoverflow.com/a/24431099
- https://pythonspeed.com/articles/slow-ci-aws-ec2/

## Disk Usage Stats

| Date        | `DRONE_MAX_PROCS` | Max used, GB |
| ----------- |------------------:| ------------:|
| 2020-02-04  |                15 |         16.9 |
