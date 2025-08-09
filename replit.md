# Overview

GenAssist is an AI-powered workflow automation platform designed to help businesses streamline their HR, IT, and Finance operations. The application allows users to interact via text or voice commands to trigger intelligent workflows such as employee onboarding, IT ticket creation, expense approvals, and meeting scheduling. The system leverages Amazon Bedrock's Titan Multimodal Embeddings G1 for advanced natural language understanding and intent detection, with full AWS services integration including Transcribe for speech-to-text and Polly for text-to-speech capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes (January 2025)

- **AWS Integration**: Migrated from OpenAI to Amazon Bedrock Titan Multimodal Embeddings G1 for intent detection
- **Speech Services**: Added AWS Transcribe and Polly integration with browser API fallbacks
- **Infrastructure**: Created comprehensive AWS CDK stack with Lambda, API Gateway, DynamoDB, and S3
- **Deployment**: Implemented CI/CD pipeline with GitHub Actions for automated AWS deployment
- **Hybrid Architecture**: Users can toggle between AWS services and browser APIs in real-time

# System Architecture

## Frontend Architecture
The client-side application is built using React with TypeScript, following modern web development best practices:

- **Framework**: React with Vite as the build tool and development server
- **Styling**: Tailwind CSS with custom CSS variables for theming, supporting both light and dark modes
- **UI Components**: Extensive use of Radix UI primitives with shadcn/ui components for consistent, accessible design
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates and background refetching
- **Routing**: Wouter for lightweight client-side routing
- **Voice Integration**: Web Speech API for speech recognition and synthesis, providing voice command capabilities

## Backend Architecture  
The server-side follows a clean, modular Express.js architecture:

- **Framework**: Express.js with TypeScript for type safety
- **API Design**: RESTful endpoints with structured JSON responses
- **Intent Detection**: Integration with OpenAI's GPT-3.5-turbo model for natural language processing and workflow intent classification
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development, designed to be easily replaceable with persistent storage
- **Development Environment**: Vite integration for hot module replacement and seamless development experience

## Data Storage
The application uses a flexible data architecture supporting multiple storage backends:

- **Schema Definition**: Drizzle ORM with PostgreSQL-compatible schema definitions
- **Development Storage**: In-memory storage implementation with full CRUD operations
- **Production Ready**: Configured for PostgreSQL with Neon Database serverless integration
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization

## Authentication and Authorization
Currently implements a simplified authentication model with plans for enterprise-grade security:

- **Development**: Basic user authentication with predefined users
- **Extensibility**: Architecture supports integration with enterprise authentication providers
- **Session Management**: Express session handling with PostgreSQL session store configuration

## AI and Machine Learning Integration
The core intelligence of the system is powered by Amazon Bedrock and AWS AI services:

- **Intent Detection**: Amazon Bedrock Titan Multimodal Embeddings G1 for parsing natural language commands into structured workflow intents
- **Entity Extraction**: Advanced ML-powered extraction of relevant entities (names, dates, roles, etc.) from user commands
- **Confidence Scoring**: AI-powered confidence assessment for intent classification with Bedrock
- **Domain Classification**: Automatic categorization of requests into HR, IT, Finance, or General domains
- **Hybrid Speech Processing**: Choice between browser APIs and AWS Transcribe/Polly for enhanced accuracy

## Voice and Speech Processing
Hybrid speech processing with AWS services and browser fallbacks:

- **AWS Transcribe**: High-accuracy speech-to-text conversion with professional-grade transcription
- **AWS Polly**: Natural-sounding text-to-speech with multiple voice options and neural engine
- **Browser API Fallback**: Web Speech API integration for offline/local processing
- **Hybrid Service Selection**: Toggle between AWS services and browser APIs in real-time
- **Voice Activity Detection**: Real-time processing of voice input with visual feedback
- **Multi-Voice Support**: Selection of different Polly voices for personalized experience

# External Dependencies

## AI and Language Processing
- **Amazon Bedrock**: Titan Multimodal Embeddings G1 model for advanced natural language understanding and intent detection
- **AWS Transcribe**: Professional speech-to-text conversion with high accuracy
- **AWS Polly**: Neural text-to-speech synthesis with natural voices
- **Configuration**: Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables

## Database and Storage
- **Amazon DynamoDB**: Serverless NoSQL database for scalable workflow and user data storage
- **Amazon S3**: Object storage for audio files and static assets
- **Local Development**: In-memory storage for development environment
- **Database Configuration**: AWS credentials provide access to DynamoDB tables

## Development and Build Tools
- **Vite**: Modern frontend build tool with hot module replacement and optimized production builds
- **TypeScript**: Full-stack type safety with strict configuration
- **ESBuild**: Fast bundling for server-side code in production builds
- **Tailwind CSS**: Utility-first styling framework with PostCSS processing

## UI and Design System
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **shadcn/ui**: Pre-styled component library built on Radix UI
- **Lucide React**: Modern icon library with consistent design
- **Font Awesome**: Additional icon support for specialized workflow indicators

## Utility Libraries
- **TanStack Query**: Advanced data fetching and caching for optimal user experience
- **date-fns**: Comprehensive date manipulation and formatting utilities
- **clsx & tailwind-merge**: Efficient conditional class name handling
- **Zod**: Runtime type validation and schema definition

## Cloud Infrastructure 
- **AWS Lambda**: Serverless compute for backend API functions
- **AWS API Gateway**: RESTful API management and routing
- **AWS CloudFront**: Global content delivery network for frontend hosting
- **AWS CDK**: Infrastructure as Code for automated deployment and resource management

## Browser APIs
- **Web Speech API**: Native browser speech recognition and synthesis capabilities (fallback)
- **MediaRecorder API**: Audio recording for AWS Transcribe integration
- **Modern JavaScript APIs**: Leveraging latest web standards for optimal performance and user experience