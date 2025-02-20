variable "clevercloud_org" {
  description = "Clever Cloud Organisation ID"
  type        = string
}

variable "clevercloud_api_token" {
  description = "Clever Cloud API Token"
  type        = string
}

variable "clevercloud_api_secret" {
  description = "Clever Cloud API Secret"
  type        = string
}

variable "project_name" {
  description = "Nom du projet"
  type        = string
  default     = "terraform"
}

variable "database_name" {
  description = "Nom de la base de données PostgreSQL"
  type        = string
  default     = "terraform"
}

variable "region" {
  description = "Région Clever Cloud"
  type        = string
  default     = "par" # Paris (Europe)
}
