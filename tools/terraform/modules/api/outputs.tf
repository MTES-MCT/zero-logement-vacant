output "url" {
  description = "Public URL for the API"
  value       = "https://${clevercloud_nodejs.api.additional_vhosts[0]}"
}
