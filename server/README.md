## Instance

- Amazon Linux
- t2.nano
- Network:
    - default VPC
    - No subnet preference
- Don't auto-assing public IP
- Enable **termination protection**
- 8G Magnetic
- Tags: `Product=devextreme-ci`
- Security group: [`devextreme-ci-sg-server`](../security-groups.md)

After launch:

- Set name: `devextreme-ci-server`
- Attach Elastic IP

## AWS API credentials

Use a separate account (`devextreme-ci-robot`) with the following permissions:

- `AmazonEC2FullAccess`
- `AutoScalingFullAccess`
- `AmazonSSMFullAccess`

## Apps

Install Docker and git:

```
sudo yum -y update
sudo yum -y install docker git
sudo service docker start
```

Clone this repo. Then:

- In `drone-server`
    - Create `secrets` file
    - `restart.sh`

- In `scaler`
    - Create `Properties/launchSettings.json` file
    - `restart.sh`

- In `log-trunc`
    - `restart.sh`
