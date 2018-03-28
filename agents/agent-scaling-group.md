## Launch Configuration

- Use a custom image described in [agent-image.md](agent-image.md)
- c5.xlarge (4 CPU)
- Name: `devextreme-ci-agent-lc-v2`
- Spot instances, bid at on-demand price ($0.17)
- IAM: `devextreme-ci-agent-iam` (read [this](http://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-access.html#sysman-access-user))
- User data: [agent-user-data.sh](agent-user-data.sh) (**make sure secrets are filled!**)
- Assign a public IP address to every instance
- 16G SSD (general purpose)
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
