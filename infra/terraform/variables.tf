# Youngsend Terraform Variables

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "zone" {
  description = "GCP primary zone (used for zonal resources)"
  type        = string
}

variable "zones" {
  description = "GCP Zones for node pools"
  type        = list(string)
  default     = []
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "cluster_name" {
  description = "GKE Cluster name"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "node_count" {
  description = "Default initial node count per node pool"
  type        = number
  default     = 3
}

variable "machine_type" {
  description = "Default machine type for node pools"
  type        = string
  default     = "e2-highcpu-4"
}

variable "subnet_cidr" {
  description = "Primary subnet CIDR"
  type        = string
  default     = "10.0.0.0/20"
}

variable "pods_cidr" {
  description = "Pods secondary range CIDR"
  type        = string
  default     = "10.4.0.0/14"
}

variable "services_cidr" {
  description = "Services secondary range CIDR"
  type        = string
  default     = "10.8.0.0/20"
}

variable "authorized_networks" {
  description = "CIDR blocks authorized to access GKE master"
  type = list(object({
    cidr_block   = string
    display_name = string
  }))
  default = []
}

variable "node_service_account" {
  description = "Service account for GKE nodes"
  type        = string
}

# ─────────────────────────────────────────────────────────────────
# Database variables
# ─────────────────────────────────────────────────────────────────

variable "db_name" {
  description = "Cloud SQL database name"
  type        = string
  default     = "youngsend"
}

variable "db_user" {
  description = "Cloud SQL database user"
  type        = string
  default     = "youngsend"
}

variable "db_password" {
  description = "Cloud SQL PostgreSQL password (use Secrets Manager in prod)"
  type        = string
  sensitive   = true
}

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-custom-4-16384"
}

variable "db_disk_size" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 100
}

# ─────────────────────────────────────────────────────────────────
# Redis variables
# ─────────────────────────────────────────────────────────────────

variable "redis_memory_size_gb" {
  description = "Memorystore Redis memory size in GB"
  type        = number
  default     = 5
}

variable "redis_failover_region" {
  description = "Redis HA failover region"
  type        = string
}
