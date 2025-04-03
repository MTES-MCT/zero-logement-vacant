terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.7.0"
    }
  }
}

resource "clevercloud_redis" "redis" {
  name   = "${var.project_name}-redis"
  plan   = var.plan
  region = var.region
}
