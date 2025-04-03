terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.7.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.6.3"
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

resource "random_password" "auth_secret" {
  length = 32
}

resource "random_password" "e2e_password" {
  length = 32
}

resource "random_password" "queue_dashboard_password" {
  length = 32
}

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

module "redis" {
  source = "./modules/redis"

  project_name = var.project_name
  region       = var.region
}

module "api" {
  source = "./modules/api"

  depends_on = [module.database, module.redis, module.s3]

  auth_secret                = random_password.auth_secret.result
  branch                     = var.branch
  database_id                = module.database.id
  database_connection_string = module.database.connection_string
  project_name               = var.project_name
  e2e_email                  = "e2e@beta.gouv.fr"
  e2e_password               = random_password.e2e_password.result
  mailer                     = var.mailer
  redis = {
    id  = module.redis.id
    url = module.redis.url
  }
  region = var.region
  s3 = {
    access_key_id     = module.s3.key_id
    bucket            = module.s3.bucket
    endpoint          = module.s3.endpoint
    region            = var.region
    id                = module.s3.id
    secret_access_key = module.s3.key_secret
  }
}

module "queue" {
  source = "./modules/queue"

  depends_on = [module.database, module.redis, module.s3]

  api_url                    = "${module.api.url}/api"
  auth_secret                = random_password.auth_secret.result
  branch                     = var.branch
  database_connection_string = module.database.connection_string
  project_name               = var.project_name
  queue_dashboard_username   = "zlv"
  queue_dashboard_password   = random_password.queue_dashboard_password.result
  redis = {
    id  = module.redis.id
    url = module.redis.url
  }
  region = var.region
  s3 = {
    access_key_id     = module.s3.key_id
    bucket            = module.s3.bucket
    endpoint          = module.s3.host
    region            = var.region
    id                = module.s3.id
    secret_access_key = module.s3.key_secret
  }
}
