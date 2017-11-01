## Launch Configuration

- Use a custom image described in [agent-image.md](agent-image.md)
- c4.xlarge (4 CPU)
- Name: `devextreme-ci-agent-lc-v1`
- Spot instances, bid at on-demand price ($0.2)
- IAM: `devextreme-ci-agent-iam` (read [this](http://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-access.html#sysman-access-user))
- User data: [agent-user-data.sh](agent-user-data.sh) (**make sure secrets are filled!**)
- Assign a public IP address to every instance
- 16G SSD (general purpose)
- Security group: `devextreme-ci-sg-agent` (default VPC, inbound TCP 22 from 0.0.0.0/0)

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
