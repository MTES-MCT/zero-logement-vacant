variable "plan" {
  description = "Taille de l’instance Redis"
  type        = string
  default     = "s_mono"
}

variable "project_name" {
  description = "Nom du projet"
  type        = string
}

variable "region" {
  description = "Région Clever Cloud"
  type        = string
}
