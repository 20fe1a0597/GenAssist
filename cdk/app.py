#!/usr/bin/env python3
import aws_cdk as cdk
from stacks.genassist_stack import GenAssistStack

app = cdk.App()

# Deploy to multiple environments
GenAssistStack(
    app, 
    "GenAssistStack",
    env=cdk.Environment(
        account=app.node.try_get_context("account"),
        region=app.node.try_get_context("region") or "us-east-1"
    ),
    description="GenAssist AI-powered workflow automation platform with Bedrock integration"
)

app.synth()