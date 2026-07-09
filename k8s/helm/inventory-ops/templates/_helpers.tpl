{{- define "inventory-ops.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "inventory-ops.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "inventory-ops.labels" -}}
app.kubernetes.io/name: {{ include "inventory-ops.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
retail.oracle.com/scenario-label: {{ .Values.environment.scenarioLabel | quote }}
{{- end -}}

{{- define "inventory-ops.selectorLabels" -}}
app.kubernetes.io/name: {{ include "inventory-ops.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "inventory-ops.dbSecretName" -}}
{{- if .Values.db.secretNameOverride -}}
{{- .Values.db.secretNameOverride -}}
{{- else if .Values.db.existingSecret -}}
{{- .Values.db.existingSecret -}}
{{- else -}}
{{- printf "%s-db" (include "inventory-ops.fullname" .) -}}
{{- end -}}
{{- end -}}
