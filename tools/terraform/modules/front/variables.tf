variable "api_url" {
  description = "API URL"
}

variable "branch" {
  description = "The branch to deploy"
  type        = string
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
  description = "The project name"
  type        = string
}

variable "region" {
  description = "Clever Cloud region"
  type        = string
}
