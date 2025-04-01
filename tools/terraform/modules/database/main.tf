terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.7.0"
    }
  }
}

resource "clevercloud_postgresql" "postgresql" {
  name   = "${var.project_name}-postgres"
  plan   = "dev"
  region = var.region
}
