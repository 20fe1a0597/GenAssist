# GenAssist - AI-Powered Workflow Automation

GenAssist is a comprehensive workflow automation platform powered by Amazon Bedrock and AWS services. It enables businesses to streamline HR, IT, and Finance operations through natural language voice and text commands.

## 🚀 Features

- **🎤 Voice & Text Commands**: Hybrid speech processing with AWS Transcribe/Polly or browser APIs
- **🤖 AI Intent Detection**: Amazon Bedrock Titan Multimodal Embeddings G1 for advanced NLP
- **⚡ Multi-Domain Workflows**: Automated HR onboarding, IT ticketing, expense processing, and more
- **☁️ AWS-Native**: Full cloud deployment with Lambda, API Gateway, DynamoDB, and S3
- **🔄 Real-time Updates**: Live workflow tracking and progress monitoring
- **🎯 Intelligent Entity Extraction**: Automatic extraction of names, dates, amounts, and context

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** with dark mode support
- **Vite** for development and building
- **TanStack Query** for state management
- **Radix UI** component library

### Backend
- **AWS Lambda** functions for serverless compute
- **Amazon API Gateway** for RESTful API management
- **Amazon DynamoDB** for scalable data storage
- **Amazon S3** for audio file storage

### AI & ML Services
- **Amazon Bedrock** (Titan Multimodal Embeddings G1)
- **AWS Transcribe** for speech-to-text
- **AWS Polly** for text-to-speech
- **Hybrid fallback** to browser Web Speech API

## 🛠️ Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.11+
- **AWS Account** with appropriate permissions
- **AWS CLI** configured
- **AWS CDK** installed globally

## 📦 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd genassist
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for CDK
cd cdk
pip install -r requirements.txt
cd ..
```

### 3. Configure AWS Credentials
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### 4. Deploy to AWS
```bash
# Make deployment script executable
chmod +x deploy/build.sh

# Run deployment
./deploy/build.sh
```

The script will:
- Build the React frontend
- Package Lambda functions
- Deploy AWS infrastructure with CDK
- Upload frontend to S3/CloudFront
- Provide deployment URLs

### 5. Local Development
```bash
# Start development server (uses in-memory storage)
npm run dev
```

Access at `http://localhost:5000`

## 🚀 Deployment

### Automated Deployment (Recommended)

Use the provided build script for complete AWS deployment:

```bash
./deploy/build.sh
```

### Manual Deployment

1. **Build Frontend**:
```bash
cd client
npm run build
cd ..
```

2. **Deploy Infrastructure**:
```bash
cd cdk
cdk bootstrap  # First time only
cdk deploy --require-approval never
cd ..
```

3. **Upload Frontend**:
```bash
# Extract bucket name from CDK outputs
aws s3 sync client/dist/ s3://your-frontend-bucket --delete
```

### CI/CD with GitHub Actions

The repository includes GitHub Actions workflow (`.github/workflows/deploy.yml`) for automated deployment on push to main branch.

**Required Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

## 📊 AWS Resources Created

The CDK stack creates the following AWS resources:

| Service | Resource | Purpose |
|---------|----------|---------|
| Lambda | Intent Detection | Bedrock integration for AI processing |
| Lambda | Transcribe Function | Speech-to-text conversion |
| Lambda | Polly Function | Text-to-speech synthesis |
| Lambda | Workflow Executor | CRUD operations for workflows |
| API Gateway | REST API | Backend API routing |
| DynamoDB | Workflows Table | Workflow data storage |
| DynamoDB | Users Table | User management |
| DynamoDB | History Table | Activity logging |
| S3 | Frontend Bucket | Static website hosting |
| S3 | Audio Bucket | Audio file storage |
| CloudFront | Distribution | Global CDN for frontend |
| IAM | Roles & Policies | Service permissions |

## 💰 Cost Estimation

**Monthly costs for moderate usage:**
- Lambda: $5-20 (depending on requests)
- DynamoDB: $5-15 (pay-per-request)
- S3: $1-5 (storage and requests)
- API Gateway: $3-10 (per million requests)
- Bedrock: $10-50 (model invocations)
- Transcribe/Polly: $5-25 (audio processing)

**Total estimated monthly cost: $30-125**

## 🔧 Configuration

### Environment Variables

**Development (.env):**
```env
# AWS Configuration (for local testing)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# Optional: OpenAI fallback
OPENAI_API_KEY=your_openai_key
```

**Production:**
AWS credentials are managed through IAM roles and CDK deployment.

### Customization

#### Add New Workflow Types
1. Update intent detection in `lambda/intent-detection/index.py`
2. Add workflow steps in `getWorkflowSteps()` function
3. Update frontend domain icons in `client/src/components/sidebar.tsx`

#### Modify AI Behavior
- Edit prompts in `lambda/intent-detection/index.py`
- Adjust confidence thresholds
- Add new entity extraction patterns

#### Voice Options
- Modify available voices in `client/src/services/aws-services.ts`
- Update Polly voice selection in the UI

## 🧪 Testing

### Local Testing
```bash
# Start development server
npm run dev

# Test voice commands
# Test text input
# Verify workflow creation
```

### API Testing
```bash
# Test health endpoint
curl https://your-api-gateway-url/api/stats

# Test intent detection
curl -X POST https://your-api-gateway-url/api/process-command \
  -H "Content-Type: application/json" \
  -d '{"text": "Onboard John Doe as Senior Developer", "isVoice": false}'
```

## 🔍 Monitoring

### CloudWatch Logs
- Lambda function logs available in CloudWatch
- API Gateway access logs
- Error tracking and debugging

### DynamoDB Monitoring
- Table metrics in CloudWatch
- Request patterns and performance

### Cost Monitoring
- AWS Cost Explorer for service breakdown
- Set up billing alerts for budget management

## 🛠️ Troubleshooting

### Common Issues

**1. CDK Deployment Fails**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Ensure CDK is bootstrapped
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

**2. Lambda Timeout Errors**
- Increase timeout in CDK stack configuration
- Optimize function code for performance

**3. CORS Issues**
- Verify API Gateway CORS configuration
- Check frontend API base URL

**4. Speech Recognition Not Working**
- Ensure HTTPS for browser APIs
- Check microphone permissions
- Verify AWS Transcribe configuration

### Cleanup

To remove all AWS resources:
```bash
./deploy/destroy.sh
```

**Warning**: This will permanently delete all data and resources.

## 📈 Scaling

### Performance Optimization
- Use DynamoDB auto-scaling
- Implement Lambda provisioned concurrency for high traffic
- Add CloudFront caching for API responses
- Use S3 transfer acceleration for global access

### Multi-Region Deployment
- Deploy CDK stack to multiple regions
- Use Route 53 for health checks and failover
- Implement cross-region DynamoDB replication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test locally
4. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Use GitHub Issues for bug reports
- **AWS Support**: Contact AWS support for service-specific issues

## 🎯 Roadmap

- [ ] Multi-tenant support
- [ ] Advanced workflow scheduling
- [ ] Integration with external systems (Slack, Teams)
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Custom voice training for domain-specific terms

---

**Built with ❤️ using AWS services and modern web technologies.**