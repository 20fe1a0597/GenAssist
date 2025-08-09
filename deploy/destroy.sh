#!/bin/bash

# GenAssist Cleanup Script

set -e

echo "🗑️  Starting GenAssist cleanup process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Confirmation prompt
read -p "⚠️  Are you sure you want to destroy the GenAssist infrastructure? This cannot be undone. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleanup cancelled."
    exit 0
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed."
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed."
    exit 1
fi

# Check AWS credentials
print_status "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured."
    exit 1
fi

# Step 1: Empty S3 buckets before destruction
print_status "Emptying S3 buckets..."

if [ -f "outputs.json" ]; then
    # Extract bucket names from CDK outputs
    FRONTEND_BUCKET=$(python3 -c "
import json
try:
    with open('outputs.json', 'r') as f:
        outputs = json.load(f)
        print(outputs['GenAssistStack']['FrontendBucketName'])
except:
    pass
" 2>/dev/null)

    AUDIO_BUCKET=$(python3 -c "
import json
try:
    with open('outputs.json', 'r') as f:
        outputs = json.load(f)
        print(outputs['GenAssistStack']['AudioBucketName'])
except:
    pass
" 2>/dev/null)

    # Empty buckets if they exist
    if [ ! -z "$FRONTEND_BUCKET" ]; then
        print_status "Emptying frontend bucket: $FRONTEND_BUCKET"
        aws s3 rm s3://$FRONTEND_BUCKET --recursive 2>/dev/null || true
    fi

    if [ ! -z "$AUDIO_BUCKET" ]; then
        print_status "Emptying audio bucket: $AUDIO_BUCKET"
        aws s3 rm s3://$AUDIO_BUCKET --recursive 2>/dev/null || true
    fi
else
    print_warning "outputs.json not found, will attempt to destroy stack anyway"
fi

# Step 2: Destroy CDK stack
print_status "Destroying GenAssist CDK stack..."

cd cdk

# Install Python dependencies
pip install -r requirements.txt 2>/dev/null || true

# Destroy the stack
cdk destroy --force

cd ..

# Step 3: Clean up local files
print_status "Cleaning up local files..."
rm -f outputs.json
rm -rf dist/
rm -rf cdk.out/

print_success "🗑️  GenAssist infrastructure cleanup completed!"
print_warning "Note: Some AWS resources may take time to be fully deleted."
print_status "CloudWatch logs are retained and may incur small charges."