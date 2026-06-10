variable "project_name" {
  description = "Project name"
  type        = string
}

variable "region" {
  description = "Région Clever Cloud"
  type        = string
}

variable "flavor" {
  description = "Clever Cloud PostgreSQL plan"
  type        = string
  default     = "xxs_sml"
}
