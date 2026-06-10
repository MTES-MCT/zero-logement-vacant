terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "2.0.1"
    }
  }
}

locals {
  host = "${var.project_name}-api.cleverapps.io"
}

resource "clevercloud_nodejs" "api" {
  name               = "${var.project_name}-api"
  region             = var.region
  build_flavor       = "M"
  min_instance_count = 1
  max_instance_count = 1
  smallest_flavor    = "S"
  biggest_flavor     = "S"
  vhosts             = [{ fqdn = local.host }]

  deployment {
    repository = "https://github.com/MTES-MCT/zero-logement-vacant"
    commit     = "refs/heads/${var.branch}"
  }

  environment = {
    AUTH_SECRET = var.auth_secret

    CC_HEALTH_CHECK_PATH = "/"
    CC_POST_BUILD_HOOK   = "yarn nx build server && yarn nx run server:migrate && yarn nx run server:seed && yarn workspaces focus @zerologementvacant/server --production"
    CC_RUN_COMMAND       = "node server/dist/app/"

    CEREMA_ENABLED = "false"

    DATABASE_ENV = "development"
    DATABASE_URL = var.database_connection_string

    E2E_EMAIL    = var.e2e.email
    E2E_PASSWORD = var.e2e.password

    HOST = local.host

    MAILER_USER     = var.mailer.username
    MAILER_PASSWORD = var.mailer.password

    METABASE_ENABLED   = "true"
    METABASE_API_TOKEN = var.metabase.api_token
    METABASE_DOMAIN    = "https://stats.zlv.beta.gouv.fr"
    METABASE_TOKEN     = var.metabase.token

    S3_ACCESS_KEY_ID     = var.s3.access_key_id
    S3_BUCKET            = var.s3.bucket
    S3_ENDPOINT          = var.s3.endpoint
    S3_REGION            = var.s3.region
    S3_SECRET_ACCESS_KEY = var.s3.secret_access_key

    SENTRY_ENABLED = "false"
    TEST_PASSWORD  = var.test_password

    TZ                             = "Etc/UTC"
    YARN_ENABLE_IMMUTABLE_INSTALLS = "true"
  }
}
