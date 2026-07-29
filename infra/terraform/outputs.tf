# Youngsend Terraform Outputs

output "cluster_endpoint" {
  description = "GKE Cluster API endpoint"
  value       = module.gke.cluster_endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE Cluster CA certificate (base64)"
  value       = module.gke.cluster_ca_certificate
  sensitive   = true
}

output "cluster_name" {
  description = "GKE Cluster name"
  value       = module.gke.cluster_name
}

output "postgresql_connection_name" {
  description = "Cloud SQL PostgreSQL instance connection name"
  value       = google_sql_database_instance.postgresql.connection_name
}

output "postgresql_host" {
  description = "Cloud SQL PostgreSQL private IP"
  value       = google_sql_database_instance.postgresql.private_ip_address
}

output "postgresql_database_url" {
  description = "PostgreSQL connection URI (use Secret Manager for password)"
  value       = "postgresql://youngsend:REDACTED@${google_sql_database_instance.postgresql.private_ip_address}:5432/youngsend?sslmode=require"
  sensitive   = true
}

output "redis_host" {
  description = "Memorystore Redis host"
  value       = google_redis_instance.youngsend.host
}

output "redis_port" {
  description = "Memorystore Redis port"
  value       = google_redis_instance.youngsend.port
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${google_redis_instance.youngsend.host}:${google_redis_instance.youngsend.port}"
}

output "ingress_ip" {
  description = "Global static IP for GKE Ingress"
  value       = google_compute_global_address.youngsend_ingress.address
}

output "vpc_name" {
  description = "VPC network name"
  value       = google_compute_network.main.name
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}
