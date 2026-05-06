import json
import boto3
import os

sqs = boto3.client('sqs')
QUEUE_URL = os.environ['SQS_URL']

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))

        sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(body)
        )

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Booking masuk antrian'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
