terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.9.0"
    }
  }
}

resource "clevercloud_postgresql" "postgresql" {
  name   = "${var.project_name}-postgres"
  plan   = "l_gnt"
  region = var.region
}
