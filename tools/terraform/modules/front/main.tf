terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "1.0.1"
    }
  }
}

resource "clevercloud_static" "front" {
  name               = "${var.project_name}-front"
  region             = var.region
  build_flavor       = "M"
  max_instance_count = 1
  min_instance_count = 1
  # Set to XS after build_flavor gets fixed
  smallest_flavor = "M"
  biggest_flavor  = "M"
  vhosts = [
    "${var.project_name}-front.cleverapps.io"
  ]

  deployment {
    repository = "https://github.com/MTES-MCT/zero-logement-vacant"
    commit     = "refs/heads/${var.branch}"
  }

  environment = {
    CC_OVERRIDE_BUILDCACHE = "frontend/dist/"
    CC_NODE_BUILD_TOOL     = "custom"
    CC_CUSTOM_BUILD_TOOL   = "corepack yarn --immutable && corepack yarn nx run $WORKSPACE:build"
    CC_PRE_BUILD_HOOK      = "corepack install && corepack yarn --immutable && corepack yarn nx run $WORKSPACE:prebuild && corepack yarn nx run $WORKSPACE:build && corepack yarn nx run $WORKSPACE:postbuild"
    CC_POST_BUILD_HOOK     = "ls -al $CC_OVERRIDE_BUILDCACHE"
    CC_RUN_COMMAND         = "corepack yarn nx run $WORKSPACE:start"
    CC_WEBROOT             = "/frontend/dist"

    NODE_ENV                  = "production"
    API_HOST                  = var.api_host
    VITE_API_URL              = var.api_url
    VITE_APP_MATOMO_ENABLED   = "false"
    VITE_APP_MATOMO_SITE_ID   = "42"
    VITE_APP_MATOMO_URL_BASE  = "unused"
    WORKSPACE                 = "@zerologementvacant/front"

    YARN_ENABLE_GLOBAL_CACHE       = "false"
    YARN_ENABLE_IMMUTABLE_INSTALLS = "true"
    YARN_GLOBAL_FOLDER             = "$APP_HOME/.yarn"
  }
}
