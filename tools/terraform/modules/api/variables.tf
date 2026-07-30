variable "auth_secret" {
  description = "A secret key to validate the token against"
  type        = string
  sensitive   = true
}

variable "branch" {
  description = "The branch to deploy"
  type        = string
}

variable "database_connection_string" {
  description = "Clever Cloud PostgreSQL host"
  type        = string
  sensitive   = true
}

variable "e2e" {
  description = "E2E testing credentials"
  type = object({
    email    = string
    password = string
  })
  sensitive = true
}

variable "mailer" {
  description = "Mailer configuration"
  type = object({
    username = string
    password = string
  })
  sensitive = true
}

variable "metabase" {
  description = "Metabase configuration"
  type = object({
    api_token = string
    token     = string
  })
  sensitive = true
}

variable "posthog" {
  description = "PostHog configuration"
  type = object({
    api_key = string
    enabled = bool
  })
  sensitive = true
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "region" {
  description = "Clever Cloud region"
  type        = string
}

variable "s3" {
  description = "S3 configuration"
  type = object({
    access_key_id     = string
    bucket            = string
    endpoint          = string
    id                = string
    region            = string
    secret_access_key = string
  })
  sensitive = true
}

variable "test_password" {
  description = "Password for the test accounts"
  type        = string
  sensitive   = true
}
