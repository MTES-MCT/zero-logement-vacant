variable "database_id" {
  description = "Clever Cloud PostgreSQL ID"
  type        = string
}

variable "database_connection_string" {
  description = "Clever Cloud PostgreSQL host"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Nom du projet"
  type        = string
}

variable "region" {
  description = "Région Clever Cloud"
  type        = string
}
