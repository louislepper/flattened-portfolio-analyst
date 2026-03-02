#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="flattened-portfolio-analyst"
SA_NAME="github-actions-deploy"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_ID="github-actions-pool"
PROVIDER_ID="github-actions-provider"

echo "=== Workload Identity Federation Setup ==="
echo ""
read -rp "Enter GitHub repo (owner/repo): " GITHUB_REPO

gcloud config set project "$PROJECT_ID"

# --- 1. Create service account ---
echo ""
echo "Creating service account..."
if gcloud iam service-accounts describe "$SA_EMAIL" \
  >/dev/null 2>&1; then
  echo "Service account already exists, skipping."
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="GitHub Actions Deploy"
  echo "Service account created. Waiting for propagation..."
  sleep 10
fi

# --- 2. Grant roles ---
echo ""
echo "Granting IAM roles..."

ROLES=(
  roles/firebasehosting.admin
  roles/cloudfunctions.developer
  roles/run.admin
  roles/iam.serviceAccountUser
  roles/artifactregistry.writer
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" \
    --quiet
done
echo "Roles granted."

# --- 3. Create Workload Identity Pool ---
echo ""
echo "Creating Workload Identity Pool..."
if gcloud iam workload-identity-pools describe "$POOL_ID" \
  --location="global" >/dev/null 2>&1; then
  echo "Pool already exists, skipping."
else
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location="global" \
    --display-name="GitHub Actions Pool"
  echo "Pool created."
fi

# --- 4. Create OIDC provider ---
echo ""
echo "Creating OIDC provider..."
if gcloud iam workload-identity-pools providers describe \
  "$PROVIDER_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
  echo "Provider already exists, skipping."
else
  gcloud iam workload-identity-pools providers create-oidc \
    "$PROVIDER_ID" \
    --location="global" \
    --workload-identity-pool="$POOL_ID" \
    --display-name="GitHub Actions Provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="\
google.subject=assertion.sub,\
attribute.repository=assertion.repository,\
attribute.actor=assertion.actor" \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}'"
  echo "Provider created."
fi

# --- 5. Allow WIF to impersonate the service account ---
echo ""
echo "Binding WIF provider to service account..."

PROJECT_NUMBER=$(
  gcloud projects describe "$PROJECT_ID" \
    --format="value(projectNumber)"
)

WIF_MEMBER="principalSet://iam.googleapis.com/\
projects/${PROJECT_NUMBER}/locations/global/\
workloadIdentityPools/${POOL_ID}/\
attribute.repository/${GITHUB_REPO}"

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="$WIF_MEMBER" \
  --quiet
echo "Binding complete."

# --- 6. Print values for GitHub secrets ---
WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/\
workloadIdentityPools/${POOL_ID}/\
providers/${PROVIDER_ID}"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Add these as GitHub repository secrets:"
echo ""
echo "  WIF_PROVIDER:"
echo "  $WIF_PROVIDER"
echo ""
echo "  WIF_SERVICE_ACCOUNT:"
echo "  $SA_EMAIL"
