# Youngsend Terraform Variables

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "youngsend-prod"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

variable "zones" {
  description = "GCP Zones for node pools"
  type        = list(string)
  default     = ["europe-west1-b", "europe-west1-c", "europe-west1-d"]
}

variable "cluster_name" {
  description = "GKE Cluster name"
  type        = string
  default     = "youngsend-prod"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
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
  default     = "youngsend-gke-nodes@youngsend-prod.iam.gserviceaccount.com"
}

variable "db_password" {
  description = "Cloud SQL PostgreSQL password (use Secrets Manager in prod)"
  type        = string
  sensitive   = true
  default     = "CHANGE_ME_IN_PRODUCTION"
}

variable "redis_memory_size_gb" {
  description = "Memorystore Redis memory size in GB"
  type        = number
  default     = 5
}

variable "redis_failover_region" {
  description = "Redis HA failover region"
  type        = string
  default     = "europe-west2"
}
