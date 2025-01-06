terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.5.1"
    }
  }
}

provider "clevercloud" {
  organisation = var.clevercloud_org
  token        = var.clevercloud_api_token
  secret       = var.clevercloud_api_secret
}
