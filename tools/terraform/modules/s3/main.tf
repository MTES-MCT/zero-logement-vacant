terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.9.0"
    }
  }
}

resource "clevercloud_cellar" "s3" {
  name   = "terraform-s3"
  region = var.region
}

resource "clevercloud_cellar_bucket" "common-s3-bucket" {
  depends_on = [clevercloud_cellar.s3]

  cellar_id = clevercloud_cellar.s3.id
  id        = var.project_name
}
