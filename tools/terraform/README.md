# Terraform configuration

Pop up the full project stack with a few commands!

## Introduction

This configuration is designed to be used with
the [Terraform](https://www.terraform.io/) tool to manage infrastructure as
code. With this tool, it becomes easy to create, update, and destroy cloud
resources with minimal effort.


The script follows these steps:
1. Create the applications and databases in Clever Cloud
2. Restore the database using a dump from the chosen database

## Prerequisites

You must install the following tools on your machine:
- [Terraform](https://www.terraform.io/downloads.html)
- [Clever Cloud CLI](https://www.clever-cloud.com/developers/doc/cli/install/)

## Where the fun begins

### Create the stack

You must configure terraform with your Clever Cloud credentials.
To do so, create a file named `terraform.tfvars` in this directory.
A `terraform.tfvars.example` file is provided to help you.

**Where to find the Clever Cloud token and secret?**
```shell
clever login
```

Next, create the stack:

```shell
terraform init
terraform plan
terraform apply
```

### Restore a dump

```shell
export CLEVER_ORG_ID=<your_organization_id>
export CLEVER_DATABASE_ID=<the_database_to_restore_from>

bash restore.sh
```

**Where to find the Clever Cloud organization ID?**

You had it when you logged in with the Clever Cloud CLI.

**Where to find the Clever Cloud database ID?**

```shell
clever -o $CLEVER_ORG_ID addon list
```
