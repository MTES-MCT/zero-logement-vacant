output "bucket" {
  value = clevercloud_cellar_bucket.common-s3-bucket.id
}

output "endpoint" {
  value = "https://${clevercloud_cellar.s3.host}"
}

output "host" {
  value = clevercloud_cellar.s3.host
}

output "id" {
  value = clevercloud_cellar.s3.id
}

output "key_id" {
  value = clevercloud_cellar.s3.key_id
}

output "key_secret" {
  value = clevercloud_cellar.s3.key_secret
}
