output "database_connection_string" {
  description = "Connection string for the PostgreSQL database"
  value       = clevercloud_postgresql.postgresql.host
}

output "api_url" {
  description = "Public URL for the API"
  value       = clevercloud_nodejs.api.vhost
}

# output "frontend_url" {
#   description = "Public URL for the React frontend"
#   value       = clevercloud_application.frontend.public_url
# }
#
# output "queue_url" {
#   description = "Public URL for the queue worker"
#   value       = clevercloud_application.queue.public_url
# }
