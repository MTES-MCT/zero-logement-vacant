terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "0.9.0"
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
  additional_vhosts = [
    "${var.project_name}-front.cleverapps.io"
  ]

  deployment {
    repository = "https://github.com/MTES-MCT/zero-logement-vacant"
    commit     = "refs/heads/${var.branch}"
  }

  environment = {
    CC_OVERRIDE_BUILDCACHE = "frontend/build/"
    CC_NODE_BUILD_TOOL     = "custom"
    CC_CUSTOM_BUILD_TOOL   = "corepack yarn workspaces focus $WORKSPACE && corepack yarn workspaces foreach --from=$WORKSPACE -Rt run build "
    CC_PRE_BUILD_HOOK      = "corepack enable && corepack yarn workspaces focus $WORKSPACE && corepack yarn workspaces foreach --from=$WORKSPACE -Rt run build "
    CC_POST_BUILD_HOOK     = "ls -al $CC_OVERRIDE_BUILDCACHE"
    CC_RUN_COMMAND         = "corepack yarn workspace $WORKSPACE start"
    CC_WEBROOT             = "/frontend/build"

    NODE_ENV                  = "production"
    REACT_APP_API_URL         = var.api_url
    REACT_APP_MATOMO_ENABLED  = "false"
    REACT_APP_MATOMO_SITE_ID  = "42"
    REACT_APP_MATOMO_URL_BASE = "unused"
    WORKSPACE                 = "@zerologementvacant/front"

    YARN_ENABLE_GLOBAL_CACHE       = "true"
    YARN_ENABLE_IMMUTABLE_INSTALLS = "true"
    YARN_GLOBAL_FOLDER             = ".yarn"
  }
}
