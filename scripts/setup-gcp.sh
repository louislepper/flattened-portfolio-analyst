#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="flattened-portfolio-analyst"

echo "=== GCP Project & Firebase Setup ==="
echo "Project ID: $PROJECT_ID"
echo ""

# # --- Pre-flight checks ---
# command -v gcloud >/dev/null 2>&1 || {
#   echo "Error: gcloud CLI is not installed."
#   exit 1
# }
# command -v firebase >/dev/null 2>&1 || {
#   echo "Error: firebase CLI is not installed."
#   exit 1
# }

# # --- 1. Create GCP project ---
# echo "Creating GCP project..."
# if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
#   echo "Project $PROJECT_ID already exists, skipping creation."
# else
#   gcloud projects create "$PROJECT_ID"
#   echo "Project created."
# fi

# # --- 2. Set as active project ---
# gcloud config set project "$PROJECT_ID"
# echo "Active project set to $PROJECT_ID."

# # --- 3. Link billing account ---
# echo ""
# echo "A billing account is required for Cloud Functions (Blaze plan)."
# echo "Available billing accounts:"
# gcloud billing accounts list
# echo ""
# read -rp "Enter billing account ID: " BILLING_ACCOUNT_ID

# gcloud billing projects link "$PROJECT_ID" \
#   --billing-account="$BILLING_ACCOUNT_ID"
# echo "Billing account linked."

# # --- 4. Enable required APIs ---
# echo ""
# echo "Enabling required APIs (this may take a minute)..."

# APIS=(
#   firebase.googleapis.com
#   firestore.googleapis.com
#   cloudfunctions.googleapis.com
#   cloudbuild.googleapis.com
#   artifactregistry.googleapis.com
#   run.googleapis.com
#   iam.googleapis.com
#   iamcredentials.googleapis.com
#   cloudresourcemanager.googleapis.com
#   serviceusage.googleapis.com
#   firebaserules.googleapis.com
#   firebaseextensions.googleapis.com
#   eventarc.googleapis.com
#   pubsub.googleapis.com
#   storage.googleapis.com
#   cloudbilling.googleapis.com
# )

# gcloud services enable "${APIS[@]}"
# echo "APIs enabled."

# --- 5. Add Firebase to the project ---
echo ""
# echo "Adding Firebase to the project..."
# firebase projects:addfirebase "$PROJECT_ID"
# echo "Firebase added."

# --- 6. Create Firestore database ---
echo ""
echo "Creating Firestore database..."
if gcloud firestore databases describe \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Firestore database already exists, skipping."
else
  gcloud firestore databases create \
    --location=us-central1 \
    --type=firestore-native
  echo "Firestore database created."
fi

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Create a GitHub repo (if not already done)"
echo "  2. Run scripts/setup-wif.sh to configure keyless auth"
