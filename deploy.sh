#!/usr/bin/env bash

set -euo pipefail

# Deploy to S3 static website hosting with sensible caching headers
# - Ensures bucket exists and is configured for website hosting
# - Applies public-read bucket policy for objects
# - Uploads with proper Cache-Control:
#     assets/ => public, max-age=31536000, immutable
#     HTML    => no-cache, no-store, must-revalidate
# - Deletes objects in S3 that no longer exist locally
#
# Usage:
#   ./deploy.sh [bucket-name]
#
# Env overrides:
#   DIST_DIR   (default: dist)
#   INDEX_DOC  (default: index.html)
#   ERROR_DOC  (default: 404.html)
#   AWS_REGION (default: from aws config, else us-east-1)

BUCKET_NAME="${1:-sunit-training}"
DIST_DIR="${DIST_DIR:-dist}"
INDEX_DOC="${INDEX_DOC:-index.html}"
ERROR_DOC="${ERROR_DOC:-404.html}"

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI not found in PATH." >&2
  exit 1
fi

if [ ! -d "${DIST_DIR}" ]; then
  echo "Error: '${DIST_DIR}' directory not found. Build your site first." >&2
  exit 1
fi

REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
REGION="${REGION:-us-east-1}"

echo "Bucket: ${BUCKET_NAME}"
echo "Region: ${REGION}"
echo "Dist dir: ${DIST_DIR}"

echo "Checking if bucket exists..."
if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
  echo "Bucket exists."
else
  echo "Creating bucket '${BUCKET_NAME}' in region '${REGION}'..."
  if [ "${REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${BUCKET_NAME}"
  else
    aws s3api create-bucket \
      --bucket "${BUCKET_NAME}" \
      --create-bucket-configuration LocationConstraint="${REGION}"
  fi
fi

echo "Configuring public access settings..."
aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

echo "Enabling static website hosting..."
aws s3 website "s3://${BUCKET_NAME}/" \
  --index-document "${INDEX_DOC}" \
  --error-document "${ERROR_DOC}"

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

aws s3api put-bucket-policy \
  --bucket "${BUCKET_NAME}" \
  --policy "${POLICY_JSON}"

echo "Uploading assets with long-term caching..."
if [ -d "${DIST_DIR}/assets" ]; then
  aws s3 sync "${DIST_DIR}/assets/" "s3://${BUCKET_NAME}/assets/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --only-show-errors
else
  echo "No assets/ directory found in '${DIST_DIR}'. Skipping assets sync."
fi

echo "Syncing non-asset files (images, html, etc.)..."
aws s3 sync "${DIST_DIR}/" "s3://${BUCKET_NAME}/" \
  --exclude "assets/*" \
  --exclude "*.html" \
  --exclude "*/*.html" \
  --exclude "*/*/*.html" \
  --exclude "*/*/*/*.html" \
  --delete \
  --only-show-errors

echo "Applying no-cache headers to HTML files..."
aws s3 cp "${DIST_DIR}/" "s3://${BUCKET_NAME}/" \
  --recursive \
  --exclude "*" \
  --include "*.html" \
  --include "*/*.html" \
  --include "*/*/*.html" \
  --include "*/*/*/*.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8" \
  --only-show-errors

WEBSITE_ENDPOINT="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
echo "\nDone. Website endpoint (may take a minute to propagate):"
echo "  ${WEBSITE_ENDPOINT}"
