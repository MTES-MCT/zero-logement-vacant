terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "1.0.1"
    }
  }
}

locals {
  host = "${var.project_name}-queue.cleverapps.io"
}

resource "clevercloud_nodejs" "queue" {
  name               = "${var.project_name}-queue"
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
    commit     = "refs/heads/${var.branch}"
  }

  environment = {
    CC_HEALTH_CHECK_PATH   = "/"
    CC_OVERRIDE_BUILDCACHE = ".:../.cache/puppeteer"
    CC_CUSTOM_BUILD_TOOL   = "corepack yarn workspaces focus $WORKSPACE && corepack yarn workspaces foreach --from=$WORKSPACE -Rt run build "
    CC_NODE_BUILD_TOOL     = "custom"
    CC_PRE_BUILD_HOOK      = "corepack enable"
    CC_PRE_RUN_HOOK        = "corepack yarn workspace $WORKSPACE prestart"
    CC_RUN_COMMAND         = "corepack yarn workspace $WORKSPACE start"

    API_HOST                 = var.api_url
    AUTH_SECRET              = var.auth_secret
    DATABASE_URL             = var.database_connection_string
    NODE_ENV                 = "production"
    QUEUE_DASHBOARD_USERNAME = var.queue_dashboard_username
    QUEUE_DASHBOARD_PASSWORD = var.queue_dashboard_password
    REDIS_URL                = var.redis.url
    S3_ACCESS_KEY_ID         = var.s3.access_key_id
    S3_BUCKET                = var.s3.bucket
    S3_ENDPOINT              = var.s3.endpoint
    S3_REGION                = var.s3.region
    S3_SECRET_ACCESS_KEY     = var.s3.secret_access_key
    WORKSPACE                = "@zerologementvacant/queue"

    YARN_ENABLE_GLOBAL_CACHE       = "true"
    YARN_ENABLE_IMMUTABLE_INSTALLS = "true"
    YARN_GLOBAL_FOLDER             = ".yarn"
  }
}
