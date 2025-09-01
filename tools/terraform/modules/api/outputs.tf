output "url" {
  description = "Public URL for the API"
  value       = "https://${one(clevercloud_nodejs.api.vhosts)}"
}
