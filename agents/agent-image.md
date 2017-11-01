Base on Amazon Linux

```
sudo yum -y update
sudo yum -y install docker
sudo service docker start
sudo shutdown -h now
```

In the EC2 instance list select **Image > Create Image**

- Name: `devextreme-ci-agent-ami`
- Tag: `Product=devextreme-ci`
