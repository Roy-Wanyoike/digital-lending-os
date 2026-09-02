# Digital Lending OS Terraform Outputs

# ─────────────────────────────────────────────────────────────────
# GKE Cluster
# ─────────────────────────────────────────────────────────────────

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

output "cluster_location" {
  description = "GKE Cluster location (region)"
  value       = module.gke.location
}

# ─────────────────────────────────────────────────────────────────
# PostgreSQL
# ─────────────────────────────────────────────────────────────────

output "postgresql_connection_name" {
  description = "Cloud SQL PostgreSQL instance connection name"
  value       = google_sql_database_instance.postgresql.connection_name
}

output "postgresql_host" {
  description = "Cloud SQL PostgreSQL private IP"
  value       = google_sql_database_instance.postgresql.private_ip_address
}

output "postgresql_database_url" {
  description = "PostgreSQL connection URI (password redacted)"
  value       = "postgresql://${var.db_user}:REDACTED@${google_sql_database_instance.postgresql.private_ip_address}:5432/${var.db_name}?sslmode=require"
  sensitive   = true
}

# ─────────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────────

output "redis_host" {
  description = "Memorystore Redis host"
  value       = google_redis_instance.digital_lending_os.host
}

output "redis_port" {
  description = "Memorystore Redis port"
  value       = google_redis_instance.digital_lending_os.port
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${google_redis_instance.digital_lending_os.host}:${google_redis_instance.digital_lending_os.port}"
}

# ─────────────────────────────────────────────────────────────────
# Networking
# ─────────────────────────────────────────────────────────────────

output "ingress_ip" {
  description = "Global static IP for GKE Ingress"
  value       = google_compute_global_address.dlo_ingress.address
}

output "vpc_name" {
  description = "VPC network name"
  value       = google_compute_network.main.name
}

# ─────────────────────────────────────────────────────────────────
# Service Accounts
# ─────────────────────────────────────────────────────────────────

output "app_service_account_email" {
  description = "Application service account email"
  value       = google_service_account.app.email
}

output "app_service_account_name" {
  description = "Application service account fully-qualified name"
  value       = google_service_account.app.name
}

# ─────────────────────────────────────────────────────────────────
# Storage & Secrets
# ─────────────────────────────────────────────────────────────────

output "logs_bucket_name" {
  description = "Cloud Storage bucket name for logs"
  value       = google_storage_bucket.logs.name
}

output "secret_manager_db_password" {
  description = "Secret Manager path for the DB password"
  value       = google_secret_manager_secret.db_password.id
}

output "secret_manager_app_secret_key" {
  description = "Secret Manager path for the app secret key"
  value       = google_secret_manager_secret.app_secret_key.id
}

output "secret_manager_jwt_secret" {
  description = "Secret Manager path for the JWT secret"
  value       = google_secret_manager_secret.jwt_secret.id
}

# ─────────────────────────────────────────────────────────────────
# Project
# ─────────────────────────────────────────────────────────────────

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}
