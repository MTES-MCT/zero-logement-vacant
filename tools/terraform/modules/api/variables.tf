variable "auth_secret" {
  description = "A secret key to validate the token against"
  type        = string
  sensitive   = true
}

variable "database_id" {
  description = "Clever Cloud PostgreSQL ID"
  type        = string
}

variable "database_connection_string" {
  description = "Clever Cloud PostgreSQL host"
  type        = string
  sensitive   = true
}

variable "e2e_email" {
  description = "End-to-end user email"
  type        = string
  default     = "e2e@beta.gouv.fr"
}

variable "e2e_password" {
  description = "End-to-end user password"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Nom du projet"
  type        = string
}

variable "region" {
  description = "Clever Cloud region"
  type        = string
}

variable "redis" {
  description = "Redis configuration"
  type = object({
    id  = string
    url = string
  })
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
