import json
import os
import boto3
from botocore.exceptions import ClientError

s3 = boto3.client('s3', region_name=os.environ['AWS_REGION'])
PRESIGN_EXPIRY = 900  # 15 minutes

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps(body, default=str)
    }

def lambda_handler(event, context):
    """
    POST /presign
    Body: {session_token, file_name, file_type}
    Returns {presigned_url, s3_key, expires_in}
    """
    try:
        body = json.loads(event.get('body', '{}'))
        session_token = body.get('session_token')
        file_name     = body.get('file_name', 'payment.jpg')
        file_type     = body.get('file_type', 'image/jpeg')

        if not session_token:
            return cors_response(400, {'error': 'Missing session_token'})

        # Sanitize filename
        import re
        safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', file_name)
        s3_key = f"payments/{session_token}/{safe_name}"
        bucket = os.environ['S3_BUCKET']

        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket,
                'Key': s3_key,
                'ContentType': file_type
            },
            ExpiresIn=PRESIGN_EXPIRY
        )

        return cors_response(200, {
            'presigned_url': presigned_url,
            's3_key': s3_key,
            's3_bucket': bucket,
            'expires_in': PRESIGN_EXPIRY,
            'message': 'Presigned URL generated. Upload within 15 minutes.'
        })

    except Exception as e:
        print(f"Error: {e}")
        return cors_response(500, {'error': str(e)})
