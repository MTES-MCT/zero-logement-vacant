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

variable "mailer" {
  description = "Mailer configuration"
  type = object({
    api_key       = string
    event_api_key = string
    host          = string
    password      = string
    port          = string
    provider      = string
    user          = string
  })
  sensitive = true
  default = {
    api_key       = ""
    event_api_key = ""
    host          = "maildev.zerologementvacant.beta.gouv.fr"
    password      = ""
    port          = "5037"
    provider      = "nodemailer"
    user          = ""
  }
}

variable "project_name" {
  description = "Nom du projet"
  type        = string
  default     = "terraform"
}

variable "region" {
  description = "Région Clever Cloud"
  type        = string
  default     = "par" # Paris (Europe)
}
