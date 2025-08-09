from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_apigateway as apigateway,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_logs as logs,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3_deployment as s3deploy,
    CfnOutput
)
from constructs import Construct
import json


class GenAssistStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # S3 Bucket for Frontend Hosting
        frontend_bucket = s3.Bucket(
            self, "GenAssistFrontendBucket",
            bucket_name=f"genassist-frontend-{self.account}",
            website_index_document="index.html",
            website_error_document="error.html",
            public_read_access=True,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                block_public_policy=False,
                ignore_public_acls=False,
                restrict_public_buckets=False
            ),
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # S3 Bucket for Audio Files (Transcribe/Polly)
        audio_bucket = s3.Bucket(
            self, "GenAssistAudioBucket",
            bucket_name=f"genassist-audio-{self.account}",
            cors=[s3.CorsRule(
                allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                allowed_origins=["*"],
                allowed_headers=["*"],
                max_age=3600
            )],
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # DynamoDB Tables
        workflows_table = dynamodb.Table(
            self, "WorkflowsTable",
            table_name="genassist-workflows",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True
        )

        workflow_history_table = dynamodb.Table(
            self, "WorkflowHistoryTable", 
            table_name="genassist-workflow-history",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        users_table = dynamodb.Table(
            self, "UsersTable",
            table_name="genassist-users", 
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        # IAM Role for Lambda Functions
        lambda_role = iam.Role(
            self, "GenAssistLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole")
            ],
            inline_policies={
                "BedrockAccess": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "bedrock:InvokeModel",
                                "bedrock:InvokeModelWithResponseStream",
                                "bedrock:ListFoundationModels",
                                "bedrock:GetFoundationModel"
                            ],
                            resources=["*"]
                        )
                    ]
                ),
                "TranscribePollyAccess": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "transcribe:StartTranscriptionJob",
                                "transcribe:GetTranscriptionJob",
                                "transcribe:ListTranscriptionJobs",
                                "polly:SynthesizeSpeech",
                                "polly:DescribeVoices"
                            ],
                            resources=["*"]
                        )
                    ]
                ),
                "S3Access": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:DeleteObject"
                            ],
                            resources=[
                                f"{audio_bucket.bucket_arn}/*"
                            ]
                        )
                    ]
                ),
                "DynamoDBAccess": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=[
                                "dynamodb:GetItem",
                                "dynamodb:PutItem",
                                "dynamodb:UpdateItem",
                                "dynamodb:DeleteItem",
                                "dynamodb:Query",
                                "dynamodb:Scan"
                            ],
                            resources=[
                                workflows_table.table_arn,
                                workflow_history_table.table_arn,
                                users_table.table_arn
                            ]
                        )
                    ]
                )
            }
        )

        # Lambda Layer for common dependencies
        dependencies_layer = _lambda.LayerVersion(
            self, "GenAssistDependenciesLayer",
            code=_lambda.Code.from_asset("lambda/layers/dependencies"),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_11],
            description="Common dependencies for GenAssist Lambda functions"
        )

        # Lambda Functions
        intent_detection_lambda = _lambda.Function(
            self, "IntentDetectionLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="index.handler",
            code=_lambda.Code.from_asset("lambda/intent-detection"),
            role=lambda_role,
            layers=[dependencies_layer],
            timeout=Duration.seconds(30),
            memory_size=512,
            environment={
                "WORKFLOWS_TABLE": workflows_table.table_name,
                "WORKFLOW_HISTORY_TABLE": workflow_history_table.table_name,
                "USERS_TABLE": users_table.table_name,
                "AUDIO_BUCKET": audio_bucket.bucket_name,
                "AWS_REGION": self.region
            }
        )

        transcribe_lambda = _lambda.Function(
            self, "TranscribeLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="index.handler", 
            code=_lambda.Code.from_asset("lambda/transcribe"),
            role=lambda_role,
            layers=[dependencies_layer],
            timeout=Duration.seconds(60),
            memory_size=1024,
            environment={
                "AUDIO_BUCKET": audio_bucket.bucket_name,
                "AWS_REGION": self.region
            }
        )

        polly_lambda = _lambda.Function(
            self, "PollyLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="index.handler",
            code=_lambda.Code.from_asset("lambda/polly"),
            role=lambda_role,
            layers=[dependencies_layer],
            timeout=Duration.seconds(30),
            memory_size=512,
            environment={
                "AUDIO_BUCKET": audio_bucket.bucket_name,
                "AWS_REGION": self.region
            }
        )

        workflow_executor_lambda = _lambda.Function(
            self, "WorkflowExecutorLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="index.handler",
            code=_lambda.Code.from_asset("lambda/workflow-executor"),
            role=lambda_role,
            layers=[dependencies_layer],
            timeout=Duration.seconds(60),
            memory_size=1024,
            environment={
                "WORKFLOWS_TABLE": workflows_table.table_name,
                "WORKFLOW_HISTORY_TABLE": workflow_history_table.table_name,
                "AWS_REGION": self.region
            }
        )

        # API Gateway
        api = apigateway.RestApi(
            self, "GenAssistAPI",
            rest_api_name="GenAssist API",
            description="GenAssist AI workflow automation API",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=["*"]
            )
        )

        # API Gateway Resources and Methods
        api_v1 = api.root.add_resource("api")
        
        # Intent detection endpoint
        process_command = api_v1.add_resource("process-command")
        process_command.add_method(
            "POST",
            apigateway.LambdaIntegration(intent_detection_lambda)
        )

        # Transcribe endpoint
        transcribe_resource = api_v1.add_resource("transcribe")
        transcribe_resource.add_method(
            "POST",
            apigateway.LambdaIntegration(transcribe_lambda)
        )

        # Polly endpoint  
        polly_resource = api_v1.add_resource("polly")
        polly_resource.add_method(
            "POST",
            apigateway.LambdaIntegration(polly_lambda)
        )

        # Workflows endpoints
        workflows_resource = api_v1.add_resource("workflows")
        workflows_resource.add_method(
            "GET",
            apigateway.LambdaIntegration(workflow_executor_lambda)
        )
        
        workflows_active = workflows_resource.add_resource("active")
        workflows_active.add_method(
            "GET", 
            apigateway.LambdaIntegration(workflow_executor_lambda)
        )

        workflow_by_id = workflows_resource.add_resource("{id}")
        workflow_by_id.add_method(
            "GET",
            apigateway.LambdaIntegration(workflow_executor_lambda)
        )

        # Activity endpoint
        activity_resource = api_v1.add_resource("activity")
        recent_activity = activity_resource.add_resource("recent")
        recent_activity.add_method(
            "GET",
            apigateway.LambdaIntegration(workflow_executor_lambda)
        )

        # Stats endpoint
        stats_resource = api_v1.add_resource("stats")
        stats_resource.add_method(
            "GET",
            apigateway.LambdaIntegration(workflow_executor_lambda)
        )

        # CloudFront Distribution for Frontend
        distribution = cloudfront.Distribution(
            self, "GenAssistDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(frontend_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED
            ),
            additional_behaviors={
                "/api/*": cloudfront.BehaviorOptions(
                    origin=origins.RestApiOrigin(api),
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL
                )
            },
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html"
                )
            ]
        )

        # CloudWatch Log Groups
        logs.LogGroup(
            self, "IntentDetectionLogGroup",
            log_group_name=f"/aws/lambda/{intent_detection_lambda.function_name}",
            retention=logs.RetentionDays.ONE_WEEK,
            removal_policy=RemovalPolicy.DESTROY
        )

        logs.LogGroup(
            self, "TranscribeLogGroup", 
            log_group_name=f"/aws/lambda/{transcribe_lambda.function_name}",
            retention=logs.RetentionDays.ONE_WEEK,
            removal_policy=RemovalPolicy.DESTROY
        )

        logs.LogGroup(
            self, "PollyLogGroup",
            log_group_name=f"/aws/lambda/{polly_lambda.function_name}",
            retention=logs.RetentionDays.ONE_WEEK,
            removal_policy=RemovalPolicy.DESTROY
        )

        logs.LogGroup(
            self, "WorkflowExecutorLogGroup",
            log_group_name=f"/aws/lambda/{workflow_executor_lambda.function_name}",
            retention=logs.RetentionDays.ONE_WEEK,
            removal_policy=RemovalPolicy.DESTROY
        )

        # Outputs
        CfnOutput(
            self, "FrontendBucketName",
            value=frontend_bucket.bucket_name,
            description="S3 bucket for frontend hosting"
        )

        CfnOutput(
            self, "AudioBucketName", 
            value=audio_bucket.bucket_name,
            description="S3 bucket for audio files"
        )

        CfnOutput(
            self, "APIEndpoint",
            value=api.url,
            description="API Gateway endpoint URL"
        )

        CfnOutput(
            self, "CloudFrontURL",
            value=f"https://{distribution.distribution_domain_name}",
            description="CloudFront distribution URL"
        )

        CfnOutput(
            self, "WorkflowsTableName",
            value=workflows_table.table_name,
            description="DynamoDB workflows table name"
        )