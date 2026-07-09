# OKE Terraform

This Terraform stack provisions two OKE clusters and node pools:

- `prod`: source application cluster.
- `clone`: thin-clone application cluster.

It does not provision ExaDB-XS, CDBs, PDBs, VCNs, subnets, route tables, NSGs, or security lists. Those are intentionally passed in as existing inputs so this stack can be used beside an established ExaDB-XS network.

## Usage

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
terraform output kubeconfig_commands
```

Use private endpoints unless your demo environment explicitly requires public control-plane access.
