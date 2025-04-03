terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.7.0"
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
  smallest_flavor    = "M"
  biggest_flavor     = "M"
  package_manager    = "custom"
  additional_vhosts  = [local.host]

  deployment {
    repository = "https://github.com/MTES-MCT/zero-logement-vacant"
    commit     = "refs/heads/main"
  }

  environment = {
    CC_CUSTOM_BUILD_TOOL   = "corepack yarn workspaces focus $WORKSPACE && corepack yarn workspaces foreach --from=$WORKSPACE -Rt run build "
    CC_HEALTH_CHECK_PATH   = "/"
    CC_NODE_BUILD_TOOL     = "custom"
    CC_OVERRIDE_BUILDCACHE = ".:../.cache/puppeteer"

    AUTH_SECRET          = var.auth_secret
    CEREMA_API           = "https://portaildf.cerema.fr"
    CEREMA_ENABLED       = "false"
    CEREMA_PASSWORD      = "unused"
    CEREMA_USERNAME      = "unused"
    DATABASE_ENV         = "development"
    DATABASE_URL         = var.database_connection_string
    E2E_EMAIL            = ""
    E2E_PASSWORD         = ""
    HOST                 = local.host
    LOG_LEVEL            = "debug"
    MAILER_API_KEY       = ""
    MAILER_EVENT_API_KEY = ""
    MAILER_HOST          = ""
    MAILER_PASSWORD      = ""
    MAILER_PORT          = ""
    MAILER_PROVIDER      = ""
    MAILER_USER          = ""
    METABASE_TOKEN       = "unused"
    NODE_ENV             = "production"
    PORT                 = "8080"
    REDIS_URL            = var.redis.url
    S3_ACCESS_KEY_ID     = var.s3.access_key_id
    S3_BUCKET            = var.s3.bucket
    S3_ENDPOINT          = var.s3.endpoint
    S3_REGION            = var.s3.region
    S3_SECRET_ACCESS_KEY = var.s3.secret_access_key
    SENTRY_ENABLED       = "false"
    TZ                   = "Etc/UTC"
    WORKSPACE            = "@zerologementvacant/server"

    YARN_ENABLE_GLOBAL_CACHE       = "true"
    YARN_ENABLE_IMMUTABLE_INSTALLS = "true"
    YARN_GLOBAL_FOLDER             = ".yarn"
  }

  hooks {
    pre_build = "corepack enable"
    pre_run   = "corepack yarn workspace $WORKSPACE migrate"
  }

  start_script = "corepack yarn workspace $WORKSPACE start"
}
