terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "1.0.1"
    }
  }
}

resource "clevercloud_postgresql" "postgresql" {
  name   = "${var.project_name}-postgres"
  plan   = "l_gnt"
  region = var.region
}
