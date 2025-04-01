output "connection_string" {
  description = "Connection string for the PostgreSQL database"
  value       = "postgres://${clevercloud_postgresql.postgresql.user}:${clevercloud_postgresql.postgresql.password}@${clevercloud_postgresql.postgresql.host}:${clevercloud_postgresql.postgresql.port}/${clevercloud_postgresql.postgresql.database}"
}

output "id" {
  description = "The postgres database id"
  value       = clevercloud_postgresql.postgresql.id
}

output "port" {
  description = "Port for the PostgreSQL database"
  value       = clevercloud_postgresql.postgresql.port
}

output "user" {
  description = "User for the PostgreSQL database"
  value       = clevercloud_postgresql.postgresql.user
}

output "password" {
  description = "Password for the PostgreSQL database"
  value       = clevercloud_postgresql.postgresql.password
}

output "name" {
  description = "Name of the PostgreSQL database"
  value       = clevercloud_postgresql.postgresql.database
}
