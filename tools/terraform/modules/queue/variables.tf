variable "api_url" {
  description = "The API URL"
  type        = string
}

variable "auth_secret" {
  description = "A secret key to validate the token against"
  type        = string
  sensitive   = true
}

variable "database_connection_string" {
  description = "Clever Cloud PostgreSQL host"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "queue_dashboard_username" {
  description = "Username for the queue dashboard"
  type        = string
  sensitive   = true
}

variable "queue_dashboard_password" {
  description = "Password for the queue dashboard"
  type        = string
  sensitive   = true
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
