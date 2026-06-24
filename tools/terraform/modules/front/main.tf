terraform {
  required_providers {
    clevercloud = {
      source  = "clevercloud/clevercloud"
      version = "2.0.1"
    }
  }
}

resource "clevercloud_static_apache" "front" {
  name               = "${var.project_name}-front"
  region             = var.region
  build_flavor       = "M"
  min_instance_count = 1
  max_instance_count = 1
  smallest_flavor    = "XS"
  biggest_flavor     = "XS"
  vhosts             = [{ fqdn = "${var.project_name}.cleverapps.io" }]

  deployment {
    repository = "https://github.com/MTES-MCT/zero-logement-vacant"
    commit     = "refs/heads/${var.branch}"
  }

  hooks {
    pre_build = "corepack enable && yarn install --immutable && yarn nx prebuild front && yarn nx build front && yarn nx postbuild front"
  }

  environment = {
    CC_OVERRIDE_BUILDCACHE = "frontend/dist"
    CC_WEBROOT             = "/frontend/dist"

    VITE_POSTHOG_API_KEY = var.posthog.api_key
    VITE_POSTHOG_ENABLED = var.posthog.enabled

    VITE_API_URL         = var.api_url

    YARN_ENABLE_IMMUTABLE_INSTALLS = "true"
  }
}
