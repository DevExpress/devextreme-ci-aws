## For agents

- Name: `devextreme-ci-sg-agent` 
- VPC: region default
- Inbound rules:
  - `TCP 22` from `0.0.0.0/0`

## For server 

- Name: `devextreme-ci-sg-server`
- VPC: region default
- Inbound rules:
  - `TCP 22` from `0.0.0.0/0`
  - `TCP 80` from `0.0.0.0/0`
  - `TCP 5000` from `devextreme-ci-sg-agent`
  - `TCP 9000` from `devextreme-ci-sg-agent`
