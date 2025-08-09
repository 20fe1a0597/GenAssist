import json
import boto3
import os
import uuid
import base64
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
transcribe = boto3.client('transcribe', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
s3 = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

AUDIO_BUCKET = os.environ['AUDIO_BUCKET']

def handler(event, context):
    """
    Lambda function to transcribe audio using Amazon Transcribe
    """
    try:
        logger.info(f"Received transcribe request: {json.dumps(event)}")
        
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
            
        audio_data = body.get('audioData')
        audio_format = body.get('format', 'wav')
        
        if not audio_data:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'success': False,
                    'error': 'Audio data is required'
                })
            }
        
        # Decode base64 audio data
        try:
            audio_bytes = base64.b64decode(audio_data)
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'success': False,
                    'error': f'Invalid audio data: {str(e)}'
                })
            }
        
        # Upload audio to S3
        audio_key = f"transcribe-input/{uuid.uuid4()}.{audio_format}"
        s3.put_object(
            Bucket=AUDIO_BUCKET,
            Key=audio_key,
            Body=audio_bytes,
            ContentType=f'audio/{audio_format}'
        )
        
        # Start transcription job
        job_name = f"genassist-transcribe-{uuid.uuid4()}"
        job_uri = f"s3://{AUDIO_BUCKET}/{audio_key}"
        
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': job_uri},
            MediaFormat=audio_format,
            LanguageCode='en-US',
            OutputBucketName=AUDIO_BUCKET,
            OutputKey=f"transcribe-output/{job_name}.json"
        )
        
        # Poll for completion (simplified for demo - in production use Step Functions)
        max_attempts = 30
        attempt = 0
        
        while attempt < max_attempts:
            response = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            status = response['TranscriptionJob']['TranscriptionJobStatus']
            
            if status == 'COMPLETED':
                # Get transcription result
                output_uri = response['TranscriptionJob']['Transcript']['TranscriptFileUri']
                transcript_text = get_transcript_from_s3(output_uri)
                
                # Clean up input audio file
                s3.delete_object(Bucket=AUDIO_BUCKET, Key=audio_key)
                
                return {
                    'statusCode': 200,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'success': True,
                        'transcript': transcript_text,
                        'jobName': job_name
                    })
                }
                
            elif status == 'FAILED':
                failure_reason = response['TranscriptionJob'].get('FailureReason', 'Unknown error')
                return {
                    'statusCode': 500,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'success': False,
                        'error': f'Transcription failed: {failure_reason}'
                    })
                }
            
            # Wait before next attempt
            import time
            time.sleep(2)
            attempt += 1
        
        return {
            'statusCode': 408,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': False,
                'error': 'Transcription timeout'
            })
        }
        
    except Exception as e:
        logger.error(f"Error in transcribe function: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
        }

def get_transcript_from_s3(transcript_uri):
    """
    Retrieve and parse transcript from S3
    """
    try:
        # Parse S3 URI
        uri_parts = transcript_uri.replace('s3://', '').split('/', 1)
        bucket = uri_parts[0]
        key = uri_parts[1]
        
        # Get transcript file from S3
        response = s3.get_object(Bucket=bucket, Key=key)
        transcript_data = json.loads(response['Body'].read())
        
        # Extract transcript text
        transcript_text = transcript_data['results']['transcripts'][0]['transcript']
        
        # Clean up transcript file
        s3.delete_object(Bucket=bucket, Key=key)
        
        return transcript_text
        
    except Exception as e:
        logger.error(f"Error getting transcript from S3: {str(e)}")
        return ""

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