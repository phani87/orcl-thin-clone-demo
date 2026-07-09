locals {
  clusters = {
    prod  = "${var.name_prefix}-prod"
    clone = "${var.name_prefix}-clone"
  }
}

resource "oci_containerengine_cluster" "this" {
  for_each           = local.clusters
  compartment_id     = var.compartment_id
  kubernetes_version = var.kubernetes_version
  name               = each.value
  vcn_id             = var.vcn_id
  type               = var.cluster_type
  freeform_tags      = merge(var.freeform_tags, { environment = each.key })

  endpoint_config {
    is_public_ip_enabled = var.public_endpoint
    subnet_id            = var.cluster_endpoint_subnet_id
  }

  cluster_pod_network_options {
    cni_type = length(var.pod_subnet_ids) > 0 ? "OCI_VCN_IP_NATIVE" : "FLANNEL_OVERLAY"
  }

  options {
    service_lb_subnet_ids = var.service_lb_subnet_ids
  }
}

resource "oci_containerengine_node_pool" "this" {
  for_each           = local.clusters
  cluster_id         = oci_containerengine_cluster.this[each.key].id
  compartment_id     = var.compartment_id
  kubernetes_version = var.kubernetes_version
  name               = "${each.value}-pool"
  node_shape         = var.node_shape
  freeform_tags      = merge(var.freeform_tags, { environment = each.key })

  node_shape_config {
    ocpus         = var.node_ocpus
    memory_in_gbs = var.node_memory_gbs
  }

  node_config_details {
    size = var.node_count_per_cluster

    dynamic "placement_configs" {
      for_each = var.node_placement_configs
      content {
        availability_domain = placement_configs.value.availability_domain
        subnet_id           = placement_configs.value.subnet_id
      }
    }

    dynamic "node_pool_pod_network_option_details" {
      for_each = length(var.pod_subnet_ids) > 0 ? [1] : []
      content {
        cni_type       = "OCI_VCN_IP_NATIVE"
        pod_subnet_ids = var.pod_subnet_ids
      }
    }
  }

  dynamic "node_source_details" {
    for_each = var.node_image_id == null ? [] : [var.node_image_id]
    content {
      image_id    = node_source_details.value
      source_type = "IMAGE"
    }
  }

  ssh_public_key = var.ssh_public_key
}
