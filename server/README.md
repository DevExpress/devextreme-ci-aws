## Instance

- Amazon Linux
- t2.micro
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

## S3 Bucket for DockerHub cache

- Name: `devextreme-ci-dockerhub-cache`
- Region: same as for EC2
- Permissions > Bucket Policy (**replace AWS account id!**):
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::????????????:user/devextreme-ci-robot"
                },
                "Action": "s3:*",
                "Resource": [
                    "arn:aws:s3:::devextreme-ci-dockerhub-cache",
                    "arn:aws:s3:::devextreme-ci-dockerhub-cache/*"
                ]
            }
        ]
    }
    ```

## Apps

Install Docker and git:

```
sudo yum -y update
sudo yum -y install docker git
sudo service docker start
```

Clone this repo. Then:

- `sudo docker network create drone-server-net`

- In `drone-server`
    - Create `secrets` file
    - `restart.sh`

- In `https-proxy`
    - `restart.sh`

- In `scaler`
    - Create `Properties/launchSettings.json` file
    - `restart.sh`

- In `log-trunc`
    - `restart.sh`

- In `dockerhub-cache`
    - create `secrets` file
    - `restart.sh`

## Hacks

1. Find builds w/o procs:

    ```sql
    select build_id, '#' || build_number 
    from builds
    where not (select count(*) from procs where proc_build_id = build_id);    
    ```
