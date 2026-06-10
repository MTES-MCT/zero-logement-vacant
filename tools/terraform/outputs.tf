output "database" {
  value     = module.database
  sensitive = true
}

output "test_password" {
  description = "The password to log in with test accounts"
  value       = random_password.e2e_password.result
  sensitive   = true
}
