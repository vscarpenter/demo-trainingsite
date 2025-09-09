#!/usr/bin/env bash

set -euo pipefail

# Sync built site to S3 using AWS profile 'sunit' and invalidate CloudFront.
# - Bucket: m365copilot.sunit.dev
# - CloudFront Distribution: E35I15ZTNNKA52
# - Ensures S3 static website hosting + public read access are configured
# - Applies long-term caching to hashed assets, and no-cache to HTML.

PROFILE="${AWS_PROFILE:-sunit}"
BUCKET_NAME="m365copilot.sunit.dev"
DIST_DIR="${DIST_DIR:-dist}"
DISTRIBUTION_ID="${CF_DISTRIBUTION_ID:-E35I15ZTNNKA52}"

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI not found in PATH." >&2
  exit 1
fi

if [ ! -d "${DIST_DIR}" ]; then
  echo "Error: '${DIST_DIR}' directory not found. Build your site first (npm run build)." >&2
  exit 1
fi

REGION="${AWS_REGION:-$(aws --profile "${PROFILE}" configure get region 2>/dev/null || true)}"
REGION="${REGION:-us-east-1}"

echo "Profile: ${PROFILE}"
echo "Bucket:  ${BUCKET_NAME}"
echo "Region:  ${REGION}"
echo "Dist:    ${DIST_DIR}"
echo "CF ID:   ${DISTRIBUTION_ID}"

# Ensure CloudFront default root object is index.html (helps avoid AccessDenied on /)
echo "Ensuring CloudFront default root is index.html..."
TMP_CFG_1=$(mktemp)
TMP_CFG_2=$(mktemp)
ETAG=$(aws --profile "${PROFILE}" cloudfront get-distribution-config \
  --id "${DISTRIBUTION_ID}" \
  --query 'ETag' \
  --output text)
aws --profile "${PROFILE}" cloudfront get-distribution-config \
  --id "${DISTRIBUTION_ID}" \
  --query 'DistributionConfig' \
  --output json > "${TMP_CFG_1}"

UPDATED=0
if command -v jq >/dev/null 2>&1; then
  jq '.DefaultRootObject = "index.html"' "${TMP_CFG_1}" > "${TMP_CFG_2}"
  UPDATED=1
elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
  PY=$(command -v python3 || command -v python)
  "$PY" - "${TMP_CFG_1}" "${TMP_CFG_2}" <<'PYCODE'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
with open(src) as f:
    cfg = json.load(f)
cfg["DefaultRootObject"] = "index.html"
with open(dst, 'w') as f:
    json.dump(cfg, f)
PYCODE
  UPDATED=1
else
  echo "Warning: neither jq nor Python is available; skipping default root update." >&2
fi

if [ "$UPDATED" = "1" ]; then
  aws --profile "${PROFILE}" cloudfront update-distribution \
    --id "${DISTRIBUTION_ID}" \
    --if-match "${ETAG}" \
    --distribution-config file://"${TMP_CFG_2}" >/dev/null
  echo "CloudFront default root set to index.html."
fi
rm -f "${TMP_CFG_1}" "${TMP_CFG_2}" || true

# Ensure bucket exists
echo "Checking if bucket exists..."
if aws --profile "${PROFILE}" s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
  echo "Bucket exists."
else
  echo "Creating bucket '${BUCKET_NAME}' in region '${REGION}'..."
  if [ "${REGION}" = "us-east-1" ]; then
    aws --profile "${PROFILE}" s3api create-bucket --bucket "${BUCKET_NAME}"
  else
    aws --profile "${PROFILE}" s3api create-bucket \
      --bucket "${BUCKET_NAME}" \
      --create-bucket-configuration LocationConstraint="${REGION}"
  fi
fi

# Configure public access for website hosting
echo "Configuring public access settings..."
aws --profile "${PROFILE}" s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

echo "Enabling static website hosting..."
aws --profile "${PROFILE}" s3 website "s3://${BUCKET_NAME}/" \
  --index-document "index.html" \
  --error-document "404.html"

echo "Applying public-read bucket policy..."
read -r -d '' POLICY_JSON <<POLICY || true
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${BUCKET_NAME}/*"]
    }
  ]
}
POLICY

aws --profile "${PROFILE}" s3api put-bucket-policy \
  --bucket "${BUCKET_NAME}" \
  --policy "${POLICY_JSON}"

echo "Syncing assets (immutable cache)..."
if [ -d "${DIST_DIR}/assets" ]; then
  aws --profile "${PROFILE}" s3 sync "${DIST_DIR}/assets/" "s3://${BUCKET_NAME}/assets/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --only-show-errors
else
  echo "No assets/ directory found in '${DIST_DIR}'. Skipping assets sync."
fi

echo "Syncing remaining static files (excluding HTML)..."
aws --profile "${PROFILE}" s3 sync "${DIST_DIR}/" "s3://${BUCKET_NAME}/" \
  --exclude "assets/*" \
  --exclude "*.html" \
  --exclude "*/*.html" \
  --exclude "*/*/*.html" \
  --exclude "*/*/*/*.html" \
  --delete \
  --only-show-errors

echo "Uploading HTML with no-cache headers..."
aws --profile "${PROFILE}" s3 cp "${DIST_DIR}/" "s3://${BUCKET_NAME}/" \
  --recursive \
  --exclude "*" \
  --include "*.html" \
  --include "*/*.html" \
  --include "*/*/*.html" \
  --include "*/*/*/*.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8" \
  --only-show-errors

echo "Creating CloudFront invalidation..."
INVALIDATION_JSON=$(aws --profile "${PROFILE}" cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*")

INVALIDATION_ID=$(printf '%s' "${INVALIDATION_JSON}" | sed -n 's/.*"Id": "\([^"]\+\)".*/\1/p' | head -n1)
echo "Invalidation created: ${INVALIDATION_ID:-(see AWS console)}"
echo "Done. Deployed to s3://${BUCKET_NAME}/ and cache invalidated."
