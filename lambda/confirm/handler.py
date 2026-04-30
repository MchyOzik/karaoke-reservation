import json
import os
import psycopg2
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def get_db_connection():
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASS']
    )

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        booking_id = body['booking_id']
        lock_id = body['lock_id']
        s3_key = body['s3_key']

        # 1. UPDATE BOOKING STATUS IN POSTGRES
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE bookings SET status = 'confirmed', payment_proof_url = %s WHERE id = %s",
                (f"s3://{os.environ['S3_PAYMENT_BUCKET']}/{s3_key}", booking_id)
            )
        conn.commit()
        conn.close()

        # 2. DELETE LOCK FROM DYNAMODB (Cleanup)
        table.delete_item(Key={'lock_id': lock_id})

        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'success': True, 'message': 'Payment confirmed. Booking completed.'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'success': False, 'error': str(e)})
        }
