terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "2.0.1"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.9.0"
    }
  }
}

provider "clevercloud" {
  organisation = var.clevercloud.org
  token        = var.clevercloud.api_token
  secret       = var.clevercloud.api_secret
}

resource "random_password" "auth_secret" {
  length = 32
}

resource "random_password" "e2e_password" {
  length = 32
}

module "database" {
  source = "./modules/database"

  flavor       = var.db.flavor
  project_name = var.project_name
  region       = var.region
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  region       = var.region
}

module "api" {
  source = "./modules/api"

  depends_on = [module.database, module.s3]

  auth_secret                = random_password.auth_secret.result
  branch                     = var.branch
  database_connection_string = module.database.connection_string
  e2e = {
    email    = "e2e@beta.gouv.fr"
    password = random_password.e2e_password.result
  }
  mailer = {
    username = var.mailer.username
    password = var.mailer.password
  }
  metabase = {
    api_token = var.metabase.api_token
    token     = var.metabase.token
  }
  posthog = {
    api_key = var.posthog.api_key
    enabled = var.posthog.enabled
  }
  project_name = var.project_name
  region       = var.region
  s3 = {
    access_key_id     = module.s3.key_id
    bucket            = module.s3.bucket
    endpoint          = module.s3.endpoint
    region            = var.region
    id                = module.s3.id
    secret_access_key = module.s3.key_secret
  }
  test_password = random_password.e2e_password.result
}

module "front" {
  source = "./modules/front"

  depends_on = [module.api]

  api_url = module.api.url
  branch  = var.branch
  posthog = {
    api_key = var.posthog.api_key
    enabled = var.posthog.enabled
  }
  project_name = var.project_name
  region       = var.region
}
