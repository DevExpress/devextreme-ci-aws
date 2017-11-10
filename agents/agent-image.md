Base on Amazon Linux

```
sudo yum -y update
sudo yum -y install docker

sudo mkdir /etc/docker
sudo nano /etc/docker/daemon.json
```

Paste (**replace `devextreme-ci-server`'s Public DNS**):

```json
{
  "registry-mirrors": [ "http://ec2-....compute.amazonaws.com:5000" ],
  "insecure-registries" : [ "ec2-....compute.amazonaws.com:5000" ]
}
```

```
sudo service docker start
sudo shutdown -h now
```

In the EC2 instance list select **Image > Create Image**

- Name: `devextreme-ci-agent-ami`
- Tag: `Product=devextreme-ci`
