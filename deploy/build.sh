#!/bin/bash

# GenAssist Build and Deployment Script

set -e

echo "🚀 Starting GenAssist build and deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Installing..."
    npm install -g aws-cdk
fi

# Check AWS credentials
print_status "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_DEFAULT_REGION:-us-east-1}

print_success "AWS Account: $AWS_ACCOUNT"
print_success "AWS Region: $AWS_REGION"

# Step 1: Build Frontend
print_status "Building React frontend..."
cd client
npm install
npm run build
cd ..

# Step 2: Prepare Lambda functions
print_status "Preparing Lambda functions..."

# Create Lambda deployment packages
mkdir -p dist/lambda

# Function to create Lambda package
create_lambda_package() {
    local function_name=$1
    local source_dir="lambda/$function_name"
    local dist_dir="dist/lambda/$function_name"
    
    print_status "Packaging $function_name Lambda function..."
    
    # Create distribution directory
    mkdir -p "$dist_dir"
    
    # Copy function code
    cp "$source_dir"/*.py "$dist_dir/"
    
    # Install dependencies if requirements.txt exists
    if [ -f "$source_dir/requirements.txt" ]; then
        pip install -r "$source_dir/requirements.txt" -t "$dist_dir/"
    fi
    
    print_success "Packaged $function_name"
}

# Package all Lambda functions
create_lambda_package "intent-detection"
create_lambda_package "transcribe"
create_lambda_package "polly"
create_lambda_package "workflow-executor"

# Step 3: Prepare dependencies layer
print_status "Creating Lambda dependencies layer..."
mkdir -p dist/lambda/layers/dependencies/python

if [ -f "lambda/layers/dependencies/requirements.txt" ]; then
    pip install -r lambda/layers/dependencies/requirements.txt -t dist/lambda/layers/dependencies/python/
fi

# Copy layer files
cp -r lambda/layers/dependencies/* dist/lambda/layers/dependencies/

# Step 4: CDK Deployment
print_status "Deploying infrastructure with AWS CDK..."

cd cdk

# Install Python dependencies
pip install -r requirements.txt

# Bootstrap CDK (if not already done)
print_status "Bootstrapping CDK..."
cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION

# Deploy the stack
print_status "Deploying GenAssist stack..."
cdk deploy --require-approval never --outputs-file ../outputs.json

cd ..

# Step 5: Deploy Frontend to S3
if [ -f "outputs.json" ]; then
    print_status "Deploying frontend to S3..."
    
    # Extract S3 bucket name from CDK outputs
    FRONTEND_BUCKET=$(python3 -c "
import json
with open('outputs.json', 'r') as f:
    outputs = json.load(f)
    print(outputs['GenAssistStack']['FrontendBucketName'])
")
    
    # Upload frontend files to S3
    aws s3 sync client/dist/ s3://$FRONTEND_BUCKET --delete
    
    print_success "Frontend deployed to S3: $FRONTEND_BUCKET"
    
    # Extract CloudFront URL
    CLOUDFRONT_URL=$(python3 -c "
import json
with open('outputs.json', 'r') as f:
    outputs = json.load(f)
    print(outputs['GenAssistStack']['CloudFrontURL'])
")
    
    print_success "Application deployed successfully!"
    print_success "Frontend URL: $CLOUDFRONT_URL"
    
    # Extract API Gateway URL
    API_URL=$(python3 -c "
import json
with open('outputs.json', 'r') as f:
    outputs = json.load(f)
    print(outputs['GenAssistStack']['APIEndpoint'])
")
    
    print_success "API Endpoint: $API_URL"
    
else
    print_error "CDK outputs file not found. Deployment may have failed."
    exit 1
fi

# Step 6: Test the deployment
print_status "Testing deployment..."

# Test API health
if curl -f "$API_URL/api/stats" > /dev/null 2>&1; then
    print_success "API is responding correctly"
else
    print_warning "API test failed - please check logs"
fi

print_success "🎉 GenAssist deployment completed successfully!"
print_status "Frontend: $CLOUDFRONT_URL"
print_status "API: $API_URL"

# Clean up
print_status "Cleaning up temporary files..."
rm -rf dist/

print_success "✅ Build and deployment process completed!"