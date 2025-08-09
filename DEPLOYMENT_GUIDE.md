# GenAssist AWS Deployment Guide

## Prerequisites Checklist

Before deploying GenAssist to AWS, ensure you have:

- [ ] AWS Account with billing enabled
- [ ] AWS CLI installed and configured
- [ ] Node.js 20+ and Python 3.11+ installed
- [ ] AWS CDK CLI installed globally (`npm install -g aws-cdk`)

## Step 1: AWS Account Setup

### Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the setup process (requires credit card)

### Configure IAM User
1. Go to IAM Console
2. Create new user: `genassist-deployer`
3. Attach policies:
   - `PowerUserAccess` (recommended for deployment)
   - OR create custom policy with specific permissions

### Generate Access Keys
1. In IAM Console → Users → `genassist-deployer`
2. Go to "Security credentials" tab
3. Click "Create access key"
4. Choose "CLI, SDK, & API access"
5. Save the Access Key ID and Secret Access Key

## Step 2: Configure AWS CLI

```bash
# Install AWS CLI if not already installed
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure

# When prompted, enter:
AWS Access Key ID [None]: YOUR_ACCESS_KEY_ID
AWS Secret Access Key [None]: YOUR_SECRET_ACCESS_KEY
Default region name [None]: us-east-1
Default output format [None]: json
```

## Step 3: Install CDK and Bootstrap

```bash
# Install AWS CDK globally
npm install -g aws-cdk

# Verify installation
cdk --version

# Bootstrap CDK (one-time setup per account/region)
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

## Step 4: Deploy GenAssist

### Option A: Automated Deployment (Recommended)
```bash
# Make script executable
chmod +x deploy/build.sh

# Run deployment script
./deploy/build.sh
```

### Option B: Manual Step-by-Step
```bash
# 1. Install dependencies
npm install
cd cdk && pip install -r requirements.txt && cd ..

# 2. Build frontend
cd client && npm install && npm run build && cd ..

# 3. Deploy infrastructure
cd cdk
cdk deploy --require-approval never --outputs-file ../outputs.json
cd ..

# 4. Upload frontend to S3
# Extract bucket name from outputs.json and upload
aws s3 sync client/dist/ s3://FRONTEND-BUCKET-NAME --delete
```

## Step 5: Verification

After deployment, you'll receive:
- **Frontend URL**: CloudFront distribution URL
- **API Endpoint**: API Gateway URL

Test the deployment:
```bash
# Test API health
curl https://YOUR-API-URL/api/stats

# Expected response: {"completed":0,"inProgress":0,"voiceCommands":0,"totalToday":0}
```

## Step 6: Set Up Secrets in Replit

In your Replit environment, you'll need to configure AWS credentials for local development:

1. Use the secrets manager in Replit to add:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `AWS_REGION`: us-east-1 (or your preferred region)

## Cost Management

### Expected Monthly Costs
- **Development/Testing**: $10-30/month
- **Light Production**: $30-80/month
- **Heavy Production**: $80-200/month

### Cost Optimization Tips
1. Set up billing alerts in AWS Console
2. Use AWS Cost Explorer to monitor spending
3. Consider using AWS Free Tier resources where available
4. Implement auto-scaling policies

## Monitoring and Maintenance

### CloudWatch Monitoring
- Lambda function logs: `/aws/lambda/FUNCTION-NAME`
- API Gateway logs: API Gateway Console
- DynamoDB metrics: CloudWatch Console

### Regular Maintenance
- Monitor AWS costs monthly
- Update Lambda function code as needed
- Review CloudWatch logs for errors
- Keep dependencies updated

## Troubleshooting

### Common Issues

**1. CDK Bootstrap Failed**
```bash
# Ensure you have correct permissions
aws sts get-caller-identity

# Re-run bootstrap with explicit account/region
cdk bootstrap aws://123456789012/us-east-1
```

**2. Lambda Deployment Timeout**
- Increase Lambda timeout in CDK stack
- Check function package size
- Verify dependencies are correctly installed

**3. API CORS Errors**
- Verify API Gateway CORS configuration
- Check CloudFront cache behavior settings

**4. DynamoDB Access Denied**
- Verify IAM role permissions for Lambda
- Check resource ARNs in IAM policies

## Security Best Practices

1. **IAM Permissions**: Use least-privilege principle
2. **API Security**: Implement API authentication when needed
3. **Data Encryption**: DynamoDB encryption at rest is enabled
4. **VPC Configuration**: Consider VPC for sensitive workloads

## Cleanup

To remove all AWS resources:
```bash
./deploy/destroy.sh
```

**Warning**: This permanently deletes all data and incurs no further costs.

## Next Steps

1. Test voice commands with AWS Transcribe/Polly
2. Create sample workflows for your organization
3. Configure custom domain (optional)
4. Set up monitoring and alerting
5. Plan for production scaling

## Support

- **AWS Documentation**: [docs.aws.amazon.com](https://docs.aws.amazon.com)
- **CDK Guide**: [docs.aws.amazon.com/cdk](https://docs.aws.amazon.com/cdk)
- **GenAssist Issues**: Use GitHub Issues for application-specific problems