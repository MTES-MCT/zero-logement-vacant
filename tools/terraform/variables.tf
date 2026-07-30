variable "branch" {
  description = "The branch to deploy"
  type        = string
  default     = "main"
}

variable "clevercloud" {
  description = "Clever Cloud credentials"
  type = object({
    org        = string
    api_token  = string
    api_secret = string
  })
}

variable "mailer" {
  description = "Mailer configuration"
  type = object({
    host     = optional(string, "maildev.zerologementvacant.beta.gouv.fr")
    port     = optional(number, 5037)
    provider = optional(string, "nodemailer")
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
  default = {
    api_key = null
    enabled = false
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "region" {
  description = "Région Clever Cloud"
  type        = string
  default     = "par" # Paris (Europe)
}

variable "db" {
  description = "Database configuration"
  type = object({
    flavor = string
  })
  default = {
    flavor = "xxs_sml"
  }
}
