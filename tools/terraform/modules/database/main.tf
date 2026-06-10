terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "2.0.1"
    }
  }
}

resource "clevercloud_postgresql" "postgresql" {
  name   = "${var.project_name}-postgres"
  plan   = var.flavor
  region = var.region
}
