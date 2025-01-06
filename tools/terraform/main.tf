# PostgreSQL Database
resource "clevercloud_postgresql" "postgresql" {
  name   = var.database_name
  plan   = "dev"
  region = var.region
}

# API Node.js
resource "clevercloud_nodejs" "api" {
  name               = "${var.project_name}-api"
  region             = var.region
  build_flavor       = "M"
  min_instance_count = 1
  max_instance_count = 1
  smallest_flavor    = "XS"
  biggest_flavor     = "XS"

  package_manager = "custom"

  dependencies = [
    clevercloud_postgresql.postgresql.id
  ]

  deployment {
    repository = "https://github.com/MTES-MCT/zero-logement-vacant"
    commit     = "refs/heads/main"
  }

  environment = {
    CC_HEALTH_CHECK_PATH   = "/"
    CC_OVERRIDE_BUILDCACHE = ".:../.cache/puppeteer"
    CEREMA_API             = "https://portaildf.cerema.fr"
    CEREMA_ENABLED         = "false"
    CEREMA_PASSWORD        = "unused"
    CEREMA_USERNAME        = "unused"
    DATABASE_ENV           = "development"
    DATABASE_URL           = clevercloud_postgresql.postgresql.host
    LOG_LEVEL              = "debug"
    PORT                   = "8080"
    TZ                     = "Etc/UTC"
    WORKSPACE              = "@zerologementvacant/server"
  }

  hooks {
    pre_run = "corepack yarn workspace $WORKSPACE migrate"
  }

  start_script = "corepack yarn workspace $WORKSPACE start"
}
