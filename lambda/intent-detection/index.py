import json
import boto3
import os
import uuid
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# DynamoDB tables
workflows_table = dynamodb.Table(os.environ['WORKFLOWS_TABLE'])
workflow_history_table = dynamodb.Table(os.environ['WORKFLOW_HISTORY_TABLE'])

def handler(event, context):
    """
    Lambda function to detect intent using Amazon Bedrock Titan Multimodal Embeddings G1
    and execute workflows
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
            
        text = body.get('text', '')
        is_voice = body.get('isVoice', False)
        
        if not text:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'success': False,
                    'error': 'Text input is required'
                })
            }
        
        # Detect intent using Bedrock Titan
        intent_result = detect_intent_with_bedrock(text)
        
        # Execute workflow
        workflow_result = execute_workflow(intent_result, text, is_voice)
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': True,
                'intent': intent_result,
                'message': workflow_result,
                'workflowId': workflow_result.get('workflowId') if isinstance(workflow_result, dict) else None
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
        }

def detect_intent_with_bedrock(text):
    """
    Use Amazon Bedrock Titan Multimodal Embeddings G1 for intent detection
    """
    try:
        # Prepare the prompt for Titan
        prompt = f"""
        Analyze the following business command and extract:
        1. Intent (one of: HR_Onboarding, HR_Offboarding, IT_Ticket, IT_Password_Reset, Finance_Expense, Finance_Approval, Meeting_Schedule, General_Query)
        2. Entities (key-value pairs of relevant information)
        3. Confidence (0-1 score)
        4. Domain (HR, IT, Finance, or General)

        Command: "{text}"

        Respond with ONLY a JSON object in this format:
        {{
            "intent": "HR_Onboarding",
            "entities": {{"employee_name": "John Doe", "role": "Developer", "start_date": "Monday"}},
            "confidence": 0.95,
            "domain": "HR"
        }}
        """
        
        # Prepare request body for Titan model
        body = {
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": 500,
                "temperature": 0.1,
                "topP": 0.9
            }
        }
        
        # Call Bedrock
        response = bedrock_runtime.invoke_model(
            modelId="amazon.titan-text-express-v1",
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json"
        )
        
        response_body = json.loads(response['body'].read())
        generated_text = response_body['results'][0]['outputText'].strip()
        
        # Try to parse the JSON response
        try:
            intent_data = json.loads(generated_text)
            return intent_data
        except json.JSONDecodeError:
            # Fallback to simple pattern matching
            logger.warning("Failed to parse Bedrock response, using fallback")
            return fallback_intent_detection(text)
            
    except Exception as e:
        logger.error(f"Bedrock error: {str(e)}")
        # Fallback to simple pattern matching
        return fallback_intent_detection(text)

def fallback_intent_detection(text):
    """
    Fallback intent detection using simple pattern matching
    """
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['onboard', 'hire', 'new employee', 'join']):
        return {
            'intent': 'HR_Onboarding',
            'entities': extract_entities(text, ['employee_name', 'role', 'start_date']),
            'confidence': 0.8,
            'domain': 'HR'
        }
    elif any(word in text_lower for word in ['ticket', 'issue', 'problem', 'bug', 'error']):
        return {
            'intent': 'IT_Ticket',
            'entities': extract_entities(text, ['issue_type', 'priority', 'description']),
            'confidence': 0.8,
            'domain': 'IT'
        }
    elif any(word in text_lower for word in ['expense', 'reimburse', 'receipt', 'payment']):
        return {
            'intent': 'Finance_Expense',
            'entities': extract_entities(text, ['amount', 'category', 'description']),
            'confidence': 0.8,
            'domain': 'Finance'
        }
    elif any(word in text_lower for word in ['meeting', 'schedule', 'calendar', 'appointment']):
        return {
            'intent': 'Meeting_Schedule',
            'entities': extract_entities(text, ['date', 'time', 'attendees', 'subject']),
            'confidence': 0.8,
            'domain': 'General'
        }
    
    return {
        'intent': 'General_Query',
        'entities': {},
        'confidence': 0.5,
        'domain': 'General'
    }

def extract_entities(text, entity_types):
    """
    Simple entity extraction
    """
    entities = {}
    words = text.split()
    
    for entity_type in entity_types:
        if entity_type == 'employee_name':
            # Look for capitalized words that might be names
            import re
            name_pattern = r'([A-Z][a-z]+ [A-Z][a-z]+)'
            matches = re.findall(name_pattern, text)
            if matches:
                entities[entity_type] = matches[0]
                
        elif entity_type == 'amount':
            # Look for dollar amounts
            import re
            amount_pattern = r'\$?(\d+(?:\.\d{2})?)'
            matches = re.findall(amount_pattern, text)
            if matches:
                entities[entity_type] = f"${matches[0]}"
                
        elif entity_type == 'role':
            # Common job roles
            roles = ['developer', 'engineer', 'manager', 'analyst', 'designer', 'intern']
            for role in roles:
                if role in text.lower():
                    entities[entity_type] = role.title()
                    break
    
    return entities

def execute_workflow(intent_result, original_text, is_voice):
    """
    Execute workflow based on detected intent
    """
    try:
        workflow_id = str(uuid.uuid4())
        
        # Create workflow record
        workflow_item = {
            'id': workflow_id,
            'title': get_workflow_title(intent_result['intent'], intent_result['entities']),
            'description': get_workflow_description(intent_result['intent'], intent_result['entities']),
            'domain': intent_result['domain'],
            'intent': intent_result['intent'],
            'entities': intent_result['entities'],
            'status': 'in_progress',
            'userId': 'default-user',  # In production, get from authentication
            'progress': 0,
            'steps': get_workflow_steps(intent_result['intent']),
            'originalText': original_text,
            'isVoice': is_voice,
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Save to DynamoDB
        workflows_table.put_item(Item=workflow_item)
        
        # Log workflow start
        history_item = {
            'id': str(uuid.uuid4()),
            'workflowId': workflow_id,
            'action': 'workflow_started',
            'status': 'info',
            'message': f'Workflow initiated: {workflow_item["title"]}',
            'timestamp': datetime.utcnow().isoformat()
        }
        workflow_history_table.put_item(Item=history_item)
        
        return {
            'workflowId': workflow_id,
            'message': f'Workflow {workflow_item["title"]} has been initiated and is now in progress.'
        }
        
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        raise e

def get_workflow_title(intent, entities):
    """
    Generate workflow title based on intent and entities
    """
    if intent == 'HR_Onboarding':
        name = entities.get('employee_name', 'New Employee')
        return f'Employee Onboarding - {name}'
    elif intent == 'IT_Ticket':
        issue = entities.get('issue_type', 'Technical Issue')
        return f'IT Support Ticket - {issue}'
    elif intent == 'Finance_Expense':
        description = entities.get('description', 'Business Expense')
        return f'Expense Report - {description}'
    elif intent == 'Meeting_Schedule':
        subject = entities.get('subject', 'Meeting')
        return f'Schedule Meeting - {subject}'
    else:
        return f'Workflow - {intent}'

def get_workflow_description(intent, entities):
    """
    Generate workflow description
    """
    if intent == 'HR_Onboarding':
        role = entities.get('role', 'new role')
        return f'Setting up accounts, scheduling orientation, and preparing workspace for {role}.'
    elif intent == 'IT_Ticket':
        description = entities.get('description', 'technical issue')
        return f'Investigating and resolving {description}.'
    elif intent == 'Finance_Expense':
        amount = entities.get('amount', 'business expense')
        return f'Processing expense report for {amount}.'
    elif intent == 'Meeting_Schedule':
        return 'Scheduling meeting and sending calendar invites.'
    else:
        return 'Processing workflow request.'

def get_workflow_steps(intent):
    """
    Get workflow steps based on intent
    """
    step_templates = {
        'HR_Onboarding': [
            {'name': 'Create employee record', 'status': 'pending'},
            {'name': 'Setup IT accounts', 'status': 'pending'},
            {'name': 'Schedule orientation', 'status': 'pending'},
            {'name': 'Prepare workspace', 'status': 'pending'},
            {'name': 'Send welcome email', 'status': 'pending'}
        ],
        'IT_Ticket': [
            {'name': 'Ticket creation', 'status': 'pending'},
            {'name': 'Issue assessment', 'status': 'pending'},
            {'name': 'Assign technician', 'status': 'pending'},
            {'name': 'Resolve issue', 'status': 'pending'}
        ],
        'Finance_Expense': [
            {'name': 'Expense validation', 'status': 'pending'},
            {'name': 'Manager approval', 'status': 'pending'},
            {'name': 'Finance review', 'status': 'pending'},
            {'name': 'Payment processing', 'status': 'pending'}
        ],
        'Meeting_Schedule': [
            {'name': 'Check availability', 'status': 'pending'},
            {'name': 'Book meeting room', 'status': 'pending'},
            {'name': 'Send invitations', 'status': 'pending'},
            {'name': 'Set up equipment', 'status': 'pending'}
        ]
    }
    
    return step_templates.get(intent, [
        {'name': 'Process request', 'status': 'pending'},
        {'name': 'Complete workflow', 'status': 'pending'}
    ])

def get_cors_headers():
    """
    Get CORS headers for API responses
    """
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }