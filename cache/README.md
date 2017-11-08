## VPC Endpoint for S3

Create a VPC endpoint:

- VPC: default region VPC
- Service: `com.amazonaws.???.s3`
- Policy: Full Access
- Select default route table

## S3 Bucket

- Name: `devextreme-ci-cache`
- Region: same where agents run

**Permissions > Bucket Policy**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::devextreme-ci-cache/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-acl": "bucket-owner-full-control",
                    "aws:sourceVpce": "vpce-????????"
                }
            }
        }
    ]
}
```

**Management > Lifecycle > Add Lifecycle Rule**

- Rule name: Expiration
- Transitions: No
- Expiration:
    - Expire current version: 5 days
    - Permanently delete previous: 5 days
    - Clean up incomplete multipart: 1 days
