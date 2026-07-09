output "cluster_ids" {
  description = "OKE cluster OCIDs keyed by prod/clone."
  value       = { for key, cluster in oci_containerengine_cluster.this : key => cluster.id }
}

output "node_pool_ids" {
  description = "OKE node pool OCIDs keyed by prod/clone."
  value       = { for key, pool in oci_containerengine_node_pool.this : key => pool.id }
}

output "kubeconfig_commands" {
  description = "OCI CLI commands to create kubeconfig entries."
  value = {
    for key, cluster in oci_containerengine_cluster.this :
    key => "oci ce cluster create-kubeconfig --cluster-id ${cluster.id} --file $HOME/.kube/config --region ${var.region} --token-version 2.0.0 --kube-endpoint ${var.public_endpoint ? "PUBLIC_ENDPOINT" : "PRIVATE_ENDPOINT"} --profile ${var.oci_profile}"
  }
}
