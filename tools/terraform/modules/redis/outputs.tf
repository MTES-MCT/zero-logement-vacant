output "host" {
  value = clevercloud_redis.redis.host
}

output "id" {
  value = clevercloud_redis.redis.id
}

output "port" {
  value = clevercloud_redis.redis.port
}

output "token" {
  value = clevercloud_redis.redis.token
}

output "url" {
  value = "redis://:${clevercloud_redis.redis.token}@${clevercloud_redis.redis.host}:${clevercloud_redis.redis.port}"
}
