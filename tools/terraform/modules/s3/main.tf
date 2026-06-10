terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "2.0.1"
    }
  }
}

resource "clevercloud_cellar" "s3" {
  name   = var.project_name
  region = var.region
}

resource "clevercloud_cellar_bucket" "bucket" {
  depends_on = [clevercloud_cellar.s3]

  cellar_id = clevercloud_cellar.s3.id
  id        = var.project_name
}
