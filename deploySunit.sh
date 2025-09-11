#!/usr/bin/env bash

set -euo pipefail

# Enhanced deployment script for Microsoft 365 Copilot Learning Platform
# - Integrates with enhanced build system (content validation, optimization, compression)
# - Bucket: m365copilot.sunit.dev
# - CloudFront Distribution: E35I15ZTNNKA52
# - Ensures S3 static website hosting + public read access are configured
# - Applies long-term caching to hashed assets, and no-cache to HTML
# - Handles gzipped files with proper content-encoding headers
#
# Environment Variables:
#   AWS_PROFILE         - AWS profile to use (default: sunit)
#   DIST_DIR           - Build directory (default: dist)
#   CF_DISTRIBUTION_ID - CloudFront distribution ID (default: E35I15ZTNNKA52)
#   BUILD_VALIDATION   - Run build validation (default: true)
#   SKIP_BUILD         - Skip build process (default: false)
#   AWS_REGION         - AWS region (default: us-east-2)
#   PARALLEL_UPLOADS   - Max parallel upload jobs (default: 8)
#
# Usage:
#   ./deploySunit.sh                    # Full build and deploy
#   SKIP_BUILD=true ./deploySunit.sh    # Deploy existing build
#   BUILD_VALIDATION=false ./deploySunit.sh  # Skip validation

PROFILE="${AWS_PROFILE:-sunit}"
BUCKET_NAME="m365copilot.sunit.dev"
DIST_DIR="${DIST_DIR:-dist}"
DISTRIBUTION_ID="${CF_DISTRIBUTION_ID:-E35I15ZTNNKA52}"
BUILD_VALIDATION="${BUILD_VALIDATION:-true}"
SKIP_BUILD="${SKIP_BUILD:-false}"
PARALLEL_UPLOADS="${PARALLEL_UPLOADS:-8}"

# Parallel upload functions
upload_gzipped_assets_parallel() {
  local assets_dir="$1"
  local max_jobs="$2"
  local job_count=0
  local pids=()
  
  echo "📦 Uploading gzipped assets with parallel processing (max jobs: ${max_jobs})..."
  
  for gz_file in "${assets_dir}/"*.gz; do
    if [ -f "$gz_file" ]; then
      # Wait if we've reached max jobs
      if [ $job_count -ge $max_jobs ]; then
        wait "${pids[0]}"
        pids=("${pids[@]:1}")  # Remove first PID
        ((job_count--))
      fi
      
      # Start background job
      (
        original_name=$(basename "$gz_file" .gz)
        s3_key="assets/${original_name}"
        
        case "$original_name" in
          *.js)   content_type="application/javascript" ;;
          *.css)  content_type="text/css" ;;
          *.json) content_type="application/json" ;;
          *.svg)  content_type="image/svg+xml" ;;
          *.woff2) content_type="font/woff2" ;;
          *.woff) content_type="font/woff" ;;
          *.ttf)  content_type="font/ttf" ;;
          *.png)  content_type="image/png" ;;
          *.jpg|*.jpeg) content_type="image/jpeg" ;;
          *.gif)  content_type="image/gif" ;;
          *.webp) content_type="image/webp" ;;
          *)      content_type="application/octet-stream" ;;
        esac
        
        aws --profile "${PROFILE}" s3 cp "$gz_file" "s3://${BUCKET_NAME}/${s3_key}" \
          --content-encoding "gzip" \
          --content-type "$content_type" \
          --cache-control "public, max-age=31536000, immutable" \
          --only-show-errors
      ) &
      
      pids+=($!)
      ((job_count++))
    fi
  done
  
  # Wait for all remaining jobs
  for pid in "${pids[@]}"; do
    wait "$pid"
  done
  
  echo "✅ Gzipped assets upload completed"
}

upload_gzipped_html_parallel() {
  local dist_dir="$1"
  local max_jobs="$2"
  local job_count=0
  local pids=()
  
  echo "🗜️  Uploading gzipped HTML files with parallel processing..."
  
  while IFS= read -r -d '' gz_file; do
    if [ -f "$gz_file" ]; then
      # Wait if we've reached max jobs
      if [ $job_count -ge $max_jobs ]; then
        wait "${pids[0]}"
        pids=("${pids[@]:1}")  # Remove first PID
        ((job_count--))
      fi
      
      # Start background job
      (
        rel_path="${gz_file#${dist_dir}/}"
        s3_key="${rel_path%.gz}"
        
        aws --profile "${PROFILE}" s3 cp "$gz_file" "s3://${BUCKET_NAME}/${s3_key}" \
          --content-encoding "gzip" \
          --content-type "text/html; charset=utf-8" \
          --cache-control "no-cache, no-store, must-revalidate" \
          --only-show-errors
      ) &
      
      pids+=($!)
      ((job_count++))
    fi
  done < <(find "${dist_dir}" -name "*.html.gz" -type f -print0)
  
  # Wait for all remaining jobs
  for pid in "${pids[@]}"; do
    wait "$pid"
  done
  
  echo "✅ Gzipped HTML upload completed"
}

upload_metadata_parallel() {
  local dist_dir="$1"
  local pids=()
  
  echo "📊 Uploading build metadata with parallel processing..."
  
  # Upload build report in background if it exists
  if [ -f "${dist_dir}/build-report.json" ]; then
    (
      aws --profile "${PROFILE}" s3 cp "${dist_dir}/build-report.json" "s3://${BUCKET_NAME}/build-report.json" \
        --content-type "application/json" \
        --cache-control "no-cache" \
        --only-show-errors
    ) &
    pids+=($!)
  fi
  
  # Upload content manifest in background if it exists
  if [ -f "${dist_dir}/content-manifest.json" ]; then
    (
      aws --profile "${PROFILE}" s3 cp "${dist_dir}/content-manifest.json" "s3://${BUCKET_NAME}/content-manifest.json" \
        --content-type "application/json" \
        --cache-control "no-cache" \
        --only-show-errors
    ) &
    pids+=($!)
  fi
  
  # Wait for all metadata uploads to complete
  for pid in "${pids[@]}"; do
    wait "$pid"
  done
  
  echo "✅ Metadata upload completed"
}

setup_cloudfront_smart() {
  local distribution_id="$1"
  
  echo "🔍 Checking CloudFront configuration..."
  
  # Get current distribution config
  local tmp_cfg=$(mktemp)
  local current_root
  
  if ! aws --profile "${PROFILE}" cloudfront get-distribution-config \
    --id "${distribution_id}" \
    --query 'DistributionConfig.DefaultRootObject' \
    --output text > "${tmp_cfg}" 2>/dev/null; then
    echo "❌ Failed to get CloudFront distribution config" >&2
    rm -f "${tmp_cfg}"
    return 1
  fi
  
  current_root=$(cat "${tmp_cfg}")
  rm -f "${tmp_cfg}"
  
  # Check if DefaultRootObject is already set correctly
  if [ "${current_root}" = "index.html" ]; then
    echo "✅ CloudFront DefaultRootObject already set to index.html"
    return 0
  fi
  
  echo "🔧 Updating CloudFront DefaultRootObject from '${current_root}' to 'index.html'..."
  
  # Get full config and ETag for update
  local tmp_cfg_1=$(mktemp)
  local tmp_cfg_2=$(mktemp)
  
  local etag=$(aws --profile "${PROFILE}" cloudfront get-distribution-config \
    --id "${distribution_id}" \
    --query 'ETag' \
    --output text)
    
  aws --profile "${PROFILE}" cloudfront get-distribution-config \
    --id "${distribution_id}" \
    --query 'DistributionConfig' \
    --output json > "${tmp_cfg_1}"
  
  # Update the config
  local updated=0
  if command -v jq >/dev/null 2>&1; then
    jq '.DefaultRootObject = "index.html"' "${tmp_cfg_1}" > "${tmp_cfg_2}"
    updated=1
  elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
    local py=$(command -v python3 || command -v python)
    "$py" - "${tmp_cfg_1}" "${tmp_cfg_2}" <<'PYCODE'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
with open(src) as f:
    cfg = json.load(f)
cfg["DefaultRootObject"] = "index.html"
with open(dst, 'w') as f:
    json.dump(cfg, f)
PYCODE
    updated=1
  else
    echo "⚠️  Warning: neither jq nor Python available; skipping DefaultRootObject update" >&2
    rm -f "${tmp_cfg_1}" "${tmp_cfg_2}"
    return 1
  fi
  
  if [ "$updated" = "1" ]; then
    if aws --profile "${PROFILE}" cloudfront update-distribution \
      --id "${distribution_id}" \
      --if-match "${etag}" \
      --distribution-config file://"${tmp_cfg_2}" >/dev/null; then
      echo "✅ CloudFront DefaultRootObject updated to index.html"
    else
      echo "❌ Failed to update CloudFront distribution" >&2
      rm -f "${tmp_cfg_1}" "${tmp_cfg_2}"
      return 1
    fi
  fi
  
  rm -f "${tmp_cfg_1}" "${tmp_cfg_2}"
  return 0
}

setup_s3_parallel() {
  local bucket_name="$1"
  local region="$2"
  local pids=()
  
  echo "🚀 Setting up S3 configuration with parallel operations..."
  
  # Check if bucket exists (must be synchronous)
  echo "🔍 Checking if bucket exists..."
  if ! aws --profile "${PROFILE}" s3api head-bucket --bucket "${bucket_name}" 2>/dev/null; then
    echo "📦 Creating bucket '${bucket_name}' in region '${region}'..."
    if [ "${region}" = "us-east-1" ]; then
      aws --profile "${PROFILE}" s3api create-bucket --bucket "${bucket_name}"
    else
      aws --profile "${PROFILE}" s3api create-bucket \
        --bucket "${bucket_name}" \
        --create-bucket-configuration LocationConstraint="${region}"
    fi
    echo "✅ Bucket created"
  else
    echo "✅ Bucket exists"
  fi
  
  # Run S3 configuration operations in parallel
  echo "⚙️  Configuring S3 settings in parallel..."
  
  # Configure public access block
  (
    aws --profile "${PROFILE}" s3api put-public-access-block \
      --bucket "${bucket_name}" \
      --public-access-block-configuration \
        BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false \
      >/dev/null 2>&1
  ) &
  pids+=($!)
  
  # Enable static website hosting
  (
    aws --profile "${PROFILE}" s3 website "s3://${bucket_name}/" \
      --index-document "index.html" \
      --error-document "404.html" \
      >/dev/null 2>&1
  ) &
  pids+=($!)
  
  # Apply bucket policy
  (
    local policy_json
    read -r -d '' policy_json <<POLICY_END || true
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${bucket_name}/*"]
    }
  ]
}
POLICY_END
    
    aws --profile "${PROFILE}" s3api put-bucket-policy \
      --bucket "${bucket_name}" \
      --policy "${policy_json}" \
      >/dev/null 2>&1
  ) &
  pids+=($!)
  
  # Wait for all S3 configuration tasks to complete
  local failed=0
  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      failed=1
    fi
  done
  
  if [ $failed -eq 0 ]; then
    echo "✅ S3 configuration completed successfully"
    return 0
  else
    echo "⚠️  Some S3 configuration operations may have failed"
    return 1
  fi
}

setup_aws_infrastructure_parallel() {
  local distribution_id="$1"
  local bucket_name="$2"
  local region="$3"
  local pids=()
  
  echo "🚀 Setting up AWS infrastructure with parallel operations..."
  
  # Run CloudFront and S3 setup in parallel
  (
    setup_cloudfront_smart "${distribution_id}"
  ) &
  pids+=($!)
  
  (
    setup_s3_parallel "${bucket_name}" "${region}"
  ) &
  pids+=($!)
  
  # Wait for both operations to complete
  local failed=0
  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      failed=1
    fi
  done
  
  if [ $failed -eq 0 ]; then
    echo "✅ AWS infrastructure setup completed successfully"
    return 0
  else
    echo "❌ Some AWS infrastructure setup operations failed"
    return 1
  fi
}

echo "🚀 Starting enhanced deployment to production..."
echo "📊 Configuration:"
echo "   Profile: ${PROFILE}"
echo "   Bucket:  ${BUCKET_NAME}"
echo "   Dist:    ${DIST_DIR}"
echo "   CF ID:   ${DISTRIBUTION_ID}"
echo "   Parallel Jobs: ${PARALLEL_UPLOADS}"

# Check required tools
if ! command -v aws >/dev/null 2>&1; then
  echo "❌ Error: aws CLI not found in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ Error: npm not found in PATH." >&2
  exit 1
fi

# Build the application if not skipping
if [ "${SKIP_BUILD}" != "true" ]; then
  echo "📦 Building application with enhanced build process..."
  
  # Use the full build process with validation
  if ! npm run build:full; then
    echo "❌ Build failed. Deployment aborted." >&2
    exit 1
  fi
  
  echo "✅ Build completed successfully"
else
  echo "⏭️  Skipping build (SKIP_BUILD=true)"
fi

# Validate build directory exists
if [ ! -d "${DIST_DIR}" ]; then
  echo "❌ Error: '${DIST_DIR}' directory not found." >&2
  echo "💡 Run 'npm run build:full' first or set SKIP_BUILD=false" >&2
  exit 1
fi

# Additional build validation if enabled
if [ "${BUILD_VALIDATION}" = "true" ]; then
  echo "🔍 Running additional build validation..."
  if ! npm run validate:build; then
    echo "❌ Build validation failed. Deployment aborted." >&2
    exit 1
  fi
  echo "✅ Build validation passed"
fi

REGION="${AWS_REGION:-$(aws --profile "${PROFILE}" configure get region 2>/dev/null || true)}"
REGION="${REGION:-us-east-2}"

echo "Profile: ${PROFILE}"
echo "Bucket:  ${BUCKET_NAME}"
echo "Region:  ${REGION}"
echo "Dist:    ${DIST_DIR}"
echo "CF ID:   ${DISTRIBUTION_ID}"

# Setup AWS infrastructure (CloudFront + S3) with parallel operations
setup_aws_infrastructure_parallel "${DISTRIBUTION_ID}" "${BUCKET_NAME}" "${REGION}"

echo "📦 Syncing assets with immutable cache headers..."
if [ -d "${DIST_DIR}/assets" ]; then
  # Upload regular assets
  aws --profile "${PROFILE}" s3 sync "${DIST_DIR}/assets/" "s3://${BUCKET_NAME}/assets/" \
    --exclude "*.gz" \
    --cache-control "public, max-age=31536000, immutable" \
    --only-show-errors
  
  # Upload gzipped assets with parallel processing
  if ls "${DIST_DIR}/assets/"*.gz >/dev/null 2>&1; then
    upload_gzipped_assets_parallel "${DIST_DIR}/assets" "${PARALLEL_UPLOADS}"
  fi
else
  echo "⚠️  No assets/ directory found in '${DIST_DIR}'. Skipping assets sync."
fi

echo "📄 Syncing static files (excluding HTML and gzipped files)..."
aws --profile "${PROFILE}" s3 sync "${DIST_DIR}/" "s3://${BUCKET_NAME}/" \
  --exclude "assets/*" \
  --exclude "*.html" \
  --exclude "*/*.html" \
  --exclude "*/*/*.html" \
  --exclude "*/*/*/*.html" \
  --exclude "*.gz" \
  --exclude "build-report.json" \
  --delete \
  --only-show-errors

echo "🌐 Uploading HTML files with no-cache headers..."
# Upload regular HTML files
aws --profile "${PROFILE}" s3 cp "${DIST_DIR}/" "s3://${BUCKET_NAME}/" \
  --recursive \
  --exclude "*" \
  --include "*.html" \
  --include "*/*.html" \
  --include "*/*/*.html" \
  --include "*/*/*/*.html" \
  --exclude "*.gz" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8" \
  --only-show-errors

# Upload gzipped HTML files with parallel processing
upload_gzipped_html_parallel "${DIST_DIR}" "${PARALLEL_UPLOADS}"

# Upload build reports and manifests with parallel processing
upload_metadata_parallel "${DIST_DIR}"

echo "🔄 Creating CloudFront invalidation..."
INVALIDATION_JSON=$(aws --profile "${PROFILE}" cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*")

INVALIDATION_ID=$(printf '%s' "${INVALIDATION_JSON}" | sed -n 's/.*"Id": "\([^"]\+\)".*/\1/p' | head -n1)
echo "✅ Invalidation created: ${INVALIDATION_ID:-(see AWS console)}"

# Display deployment summary
echo ""
echo "🎉 Deployment Summary:"
echo "   ✅ Build: Enhanced build process with validation and optimization"
echo "   ✅ Assets: Uploaded with immutable cache headers and gzip compression"
echo "   ✅ HTML: Uploaded with no-cache headers and gzip compression"
echo "   ✅ Metadata: Build reports and content manifest uploaded"
echo "   ✅ CloudFront: Cache invalidated (ID: ${INVALIDATION_ID:-(see console)})"
echo ""
echo "🌐 Website URL: https://m365copilot.sunit.dev"
echo "📊 Build Report: https://m365copilot.sunit.dev/build-report.json"
echo "📋 Content Manifest: https://m365copilot.sunit.dev/content-manifest.json"
echo ""
echo "✅ Deployment to production complete!"

# Optional: Display build statistics if available
if [ -f "${DIST_DIR}/build-report.json" ]; then
  echo ""
  echo "📊 Build Statistics:"
  if command -v jq >/dev/null 2>&1; then
    echo "   Total Files: $(jq -r '.totalFiles' "${DIST_DIR}/build-report.json")"
    echo "   HTML Minified: $(jq -r '.optimization.htmlMinification.filesProcessed' "${DIST_DIR}/build-report.json")"
    echo "   Files Compressed: $(jq -r '.optimization.compression.filesCompressed' "${DIST_DIR}/build-report.json")"
    echo "   Avg Compression: $(jq -r '.optimization.compression.averageReduction' "${DIST_DIR}/build-report.json")"
  else
    echo "   Build report available at: ${DIST_DIR}/build-report.json"
  fi
fi
