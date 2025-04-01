terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.7.0"
    }
  }
}

provider "clevercloud" {
  organisation = var.clevercloud_org
  token        = var.clevercloud_api_token
  secret       = var.clevercloud_api_secret
}

# module "front" {
#   source = "./modules/front"
# }

module "api" {
  source = "./modules/api"

  depends_on = [module.database]

  database_id                = module.database.id
  database_connection_string = module.database.connection_string
  project_name               = var.project_name
  region                     = var.region
}

# module "queue" {
#   source = "./modules/queue"
# }

module "database" {
  source = "./modules/database"

  project_name = var.project_name
  region       = var.region
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  region       = var.region
}
