terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.29"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

provider "kubernetes" {
  host                   = "https://${module.gke.cluster_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
}

data "google_client_config" "default" {}

resource "google_compute_network" "main" {
  name                    = "${var.project_id}-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  depends_on = [google_project_service.required_apis]
}

resource "google_compute_subnetwork" "primary" {
  name          = "${var.project_id}-subnet-primary"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.subnet_cidr
  private_ip_google_access = true
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_cidr
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }
}

resource "google_project_service" "required_apis" {
  for_each = toset([
    "container.googleapis.com",
    "compute.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "servicenetworking.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
  ])
  service            = each.value
  project            = var.project_id
  disable_on_destroy = false
}

module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "~> 31.0"
  project_id = var.project_id
  region     = var.region
  name       = var.cluster_name
  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.primary.name
  ip_range_pods     = var.pods_cidr
  ip_range_services = var.services_cidr
  kubernetes_version = var.kubernetes_version
  release_channel    = "REGULAR"
  private_cluster               = true
  enable_private_endpoint       = false
  enable_private_nodes          = true
  master_authorized_networks    = var.authorized_networks
  dns_cache                     = true
  workload_identity_config = {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  network_policy = true
  node_pools = [
    {
      name               = "frontend"
      machine_type       = "e2-highcpu-4"
      node_locations     = var.zones
      min_count          = 3
      max_count          = 100
      local_ssd_count    = 0
      spot               = true
      disk_size_gb       = 50
      disk_type          = "pd-standard"
      image_type         = "COS_CONTAINERD"
      enable_autoscaling = true
      auto_upgrade       = true
      auto_repair        = true
      service_account    = var.node_service_account
      preemptible        = false
      initial_node_count = 3
      max_pods_per_node  = 110
    },
    {
      name               = "backend"
      machine_type       = "e2-highmem-4"
      node_locations     = var.zones
      min_count          = 3
      max_count          = 50
      local_ssd_count    = 0
      spot               = false
      disk_size_gb       = 100
      disk_type          = "pd-ssd"
      image_type         = "COS_CONTAINERD"
      enable_autoscaling = true
      auto_upgrade       = true
      auto_repair        = true
      service_account    = var.node_service_account
      preemptible        = false
      initial_node_count = 3
      max_pods_per_node  = 110
    },
    {
      name               = "data"
      machine_type       = "n2-highmem-8"
      node_locations     = var.zones
      min_count          = 3
      max_count          = 20
      local_ssd_count    = 0
      spot               = false
      disk_size_gb       = 500
      disk_type          = "pd-ssd"
      image_type         = "COS_CONTAINERD"
      enable_autoscaling = true
      auto_upgrade       = true
      auto_repair        = true
      service_account    = var.node_service_account
      preemptible        = false
      initial_node_count = 3
      max_pods_per_node  = 110
      taint = [{
        key    = "node-role"
        value  = "data"
        effect = "NO_SCHEDULE"
      }]
    }
  ]
  node_pools_labels = {
    all = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
    frontend = {
      "node-pool" = "frontend"
      "app.kubernetes.io/component" = "frontend"
    }
    backend = {
      "node-pool" = "backend"
      "app.kubernetes.io/component" = "backend"
    }
    data = {
      "node-pool" = "data"
      "app.kubernetes.io/component" = "data"
    }
  }
  node_pools_taints = {
    data = [{
      key    = "node-role"
      value  = "data"
      effect = "NO_SCHEDULE"
    }]
  }
  depends_on = [google_project_service.required_apis]
}

resource "google_sql_database_instance" "postgresql" {
  name             = "${var.project_id}-postgresql"
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_16"
  settings {
    tier              = "db-custom-4-16384"
    disk_size         = 100
    disk_type         = "PD_SSD"
    availability_type = "REGIONAL"
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups_count = 30
      }
    }
    database_flags {
      name  = "log_min_duration_statement"
      value = "500"
    }
    database_flags {
      name  = "pgaudit.log"
      value = "DDL,WRITE"
    }
    maintenance_window {
      day          = 6
      hour         = 4
      update_track = "STABLE"
    }
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
      require_ssl     = true
    }
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }
  deletion_protection = true
  depends_on = [google_project_service.required_apis]
}

resource "google_sql_database" "youngsend" {
  name     = "youngsend"
  project  = var.project_id
  instance = google_sql_database_instance.postgresql.name
}

resource "google_sql_user" "youngsend" {
  name     = "youngsend"
  project  = var.project_id
  instance = google_sql_database_instance.postgresql.name
  password = var.db_password
}

resource "google_redis_instance" "youngsend" {
  name           = "${var.project_id}-redis"
  project        = var.project_id
  region         = var.region
  tier           = "STANDARD_HA"
  memory_size_gb = var.redis_memory_size_gb
  redis_version  = "REDIS_7_2"
  location_id             = var.region
  alternative_location_id = var.redis_failover_region
  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_configs = {
    maxmemory-policy     = "allkeys-lru"
    notify-keyspace-events = "Ex"
  }
  maintenance_policy {
    weekly_maintenance_window {
      day = "SATURDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "TWENTY_FOUR_HOURS"
  }
  depends_on = [google_project_service.required_apis]
}

resource "google_service_account" "cloudsql_proxy" {
  account_id   = "cloudsql-proxy"
  project      = var.project_id
  display_name = "Cloud SQL Auth Proxy SA"
}

resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudsql_proxy.email}"
}

resource "google_compute_global_address" "youngsend_ingress" {
  name    = "youngsend-prod-ip"
  project = var.project_id
}

resource "google_compute_ssl_policy" "youngsend" {
  name    = "youngsend-ssl-policy"
  project = var.project_id
  profile = "MODERN"
  min_tls_version = "1.2"
}
