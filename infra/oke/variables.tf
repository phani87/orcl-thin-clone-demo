variable "region" {
  description = "OCI region for both OKE clusters."
  type        = string
}

variable "oci_profile" {
  description = "OCI CLI/config profile to use."
  type        = string
  default     = "DEFAULT"
}

variable "compartment_id" {
  description = "Compartment OCID for OKE resources."
  type        = string
}

variable "name_prefix" {
  description = "Prefix applied to both clusters and node pools."
  type        = string
  default     = "retail-inventory"
}

variable "kubernetes_version" {
  description = "OKE Kubernetes version, for example v1.31.1."
  type        = string
}

variable "vcn_id" {
  description = "Existing VCN OCID reachable from ExaDB-XS."
  type        = string
}

variable "cluster_endpoint_subnet_id" {
  description = "Subnet OCID for OKE control plane endpoints."
  type        = string
}

variable "service_lb_subnet_ids" {
  description = "Subnet OCIDs used by Kubernetes LoadBalancer services."
  type        = list(string)
}

variable "node_placement_configs" {
  description = "Node placement configs. Provide at least one availability domain/subnet pair."
  type = list(object({
    availability_domain = string
    subnet_id           = string
  }))
}

variable "pod_subnet_ids" {
  description = "Pod subnet OCIDs for OCI VCN-native pod networking."
  type        = list(string)
  default     = []
}

variable "public_endpoint" {
  description = "Whether OKE cluster endpoints get public IPs."
  type        = bool
  default     = false
}

variable "cluster_type" {
  description = "OKE cluster type."
  type        = string
  default     = "ENHANCED_CLUSTER"
}

variable "node_shape" {
  description = "Compute shape for worker nodes."
  type        = string
  default     = "VM.Standard.E5.Flex"
}

variable "node_ocpus" {
  description = "OCPUs per worker node when using a flex shape."
  type        = number
  default     = 2
}

variable "node_memory_gbs" {
  description = "Memory per worker node when using a flex shape."
  type        = number
  default     = 16
}

variable "node_count_per_cluster" {
  description = "Worker node count per OKE cluster."
  type        = number
  default     = 3
}

variable "node_image_id" {
  description = "Optional OKE worker image OCID. Leave null to use provider/service defaults when available."
  type        = string
  default     = null
}

variable "ssh_public_key" {
  description = "Optional SSH public key for worker nodes."
  type        = string
  default     = null
}

variable "freeform_tags" {
  description = "Free-form tags applied to OKE resources."
  type        = map(string)
  default = {
    project = "retail-inventory-thin-clone-demo"
  }
}
