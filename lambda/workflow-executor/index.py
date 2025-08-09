import json
import boto3
import os
import logging
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# DynamoDB tables
workflows_table = dynamodb.Table(os.environ['WORKFLOWS_TABLE'])
workflow_history_table = dynamodb.Table(os.environ['WORKFLOW_HISTORY_TABLE'])

def handler(event, context):
    """
    Lambda function to handle workflow operations (CRUD)
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        query_params = event.get('queryStringParameters') or {}
        
        if '/workflows/active' in path and http_method == 'GET':
            return get_active_workflows()
        elif '/workflows/' in path and http_method == 'GET':
            workflow_id = path.split('/')[-1]
            return get_workflow_by_id(workflow_id)
        elif '/activity/recent' in path and http_method == 'GET':
            limit = int(query_params.get('limit', 10))
            return get_recent_activity(limit)
        elif '/stats' in path and http_method == 'GET':
            return get_stats()
        else:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Endpoint not found'
                })
            }
            
    except Exception as e:
        logger.error(f"Error in workflow executor: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }

def get_active_workflows():
    """
    Get all active (in-progress and pending) workflows
    """
    try:
        # Scan for active workflows
        response = workflows_table.scan(
            FilterExpression='#status IN (:pending, :in_progress)',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':pending': 'pending',
                ':in_progress': 'in_progress'
            }
        )
        
        workflows = response.get('Items', [])
        
        # Sort by creation date (newest first)
        workflows.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(workflows, default=str)
        }
        
    except Exception as e:
        logger.error(f"Error getting active workflows: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': f'Error retrieving workflows: {str(e)}'
            })
        }

def get_workflow_by_id(workflow_id):
    """
    Get a specific workflow by ID
    """
    try:
        response = workflows_table.get_item(Key={'id': workflow_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Workflow not found'
                })
            }
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(response['Item'], default=str)
        }
        
    except Exception as e:
        logger.error(f"Error getting workflow {workflow_id}: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': f'Error retrieving workflow: {str(e)}'
            })
        }

def get_recent_activity(limit=10):
    """
    Get recent workflow activity
    """
    try:
        # Scan workflow history and sort by timestamp
        response = workflow_history_table.scan()
        
        items = response.get('Items', [])
        
        # Sort by timestamp (newest first)
        items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Limit results
        items = items[:limit]
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(items, default=str)
        }
        
    except Exception as e:
        logger.error(f"Error getting recent activity: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': f'Error retrieving activity: {str(e)}'
            })
        }

def get_stats():
    """
    Get workflow statistics for today
    """
    try:
        # Get today's date range
        today = datetime.utcnow().date()
        today_start = today.isoformat()
        tomorrow = today + timedelta(days=1)
        tomorrow_start = tomorrow.isoformat()
        
        # Scan all workflows
        response = workflows_table.scan()
        all_workflows = response.get('Items', [])
        
        # Filter for today's workflows
        today_workflows = []
        for workflow in all_workflows:
            created_at = workflow.get('createdAt', '')
            if created_at and created_at >= today_start and created_at < tomorrow_start:
                today_workflows.append(workflow)
        
        # Calculate statistics
        stats = {
            'completed': len([w for w in today_workflows if w.get('status') == 'completed']),
            'inProgress': len([w for w in today_workflows if w.get('status') == 'in_progress']),
            'voiceCommands': len([w for w in today_workflows if w.get('isVoice', False)]),
            'totalToday': len(today_workflows)
        }
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(stats)
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': f'Error retrieving stats: {str(e)}'
            })
        }

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