import json
import boto3
import os
import uuid
import base64
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
polly = boto3.client('polly', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
s3 = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

AUDIO_BUCKET = os.environ['AUDIO_BUCKET']

def handler(event, context):
    """
    Lambda function to synthesize speech using Amazon Polly
    """
    try:
        logger.info(f"Received Polly request: {json.dumps(event)}")
        
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
            
        text = body.get('text', '')
        voice_id = body.get('voiceId', 'Joanna')
        output_format = body.get('outputFormat', 'mp3')
        
        if not text:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'success': False,
                    'error': 'Text is required'
                })
            }
        
        # Validate voice ID
        valid_voices = get_available_voices()
        if voice_id not in valid_voices:
            voice_id = 'Joanna'  # Default fallback
        
        # Synthesize speech
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat=output_format,
            VoiceId=voice_id,
            Engine='neural'  # Use neural engine for better quality
        )
        
        # Read audio stream
        audio_data = response['AudioStream'].read()
        
        # Upload to S3
        audio_key = f"polly-output/{uuid.uuid4()}.{output_format}"
        s3.put_object(
            Bucket=AUDIO_BUCKET,
            Key=audio_key,
            Body=audio_data,
            ContentType=f'audio/{output_format}'
        )
        
        # Generate presigned URL for audio download
        audio_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': AUDIO_BUCKET, 'Key': audio_key},
            ExpiresIn=3600  # 1 hour
        )
        
        # Also return base64 encoded audio for direct playback
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': True,
                'audioUrl': audio_url,
                'audioData': audio_base64,
                'format': output_format,
                'voiceId': voice_id,
                'text': text
            })
        }
        
    except Exception as e:
        logger.error(f"Error in Polly function: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
        }

def get_available_voices():
    """
    Get list of available Polly voices
    """
    try:
        response = polly.describe_voices(LanguageCode='en-US')
        return [voice['Id'] for voice in response['Voices']]
    except Exception as e:
        logger.error(f"Error getting voices: {str(e)}")
        # Return common English voices as fallback
        return ['Joanna', 'Matthew', 'Ivy', 'Justin', 'Kendra', 'Kimberly', 'Salli', 'Joey']

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