import json
import os
import uuid
import time
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
room_id = body['room_id']
customer_name = body['customer_name']
alias = body.get('alias', 'Anonymous')
customer_phone = body['customer_phone']
booking_date = body['date']
start_time = body['start']
end_time = body['end']
total_price = body['total_price']

booking_id = str(uuid.uuid4())  
    session_token = str(uuid.uuid4())  
    expires_at = int(time.time()) + 900 # 15 Minutes  
      
    # 1. VERIFY AVAILABILITY IN POSTGRES  
    conn = get_db_connection()  
    with conn.cursor() as cur:  
        cur.execute(  
            "SELECT id FROM bookings WHERE room_id = %s AND booking_date = %s AND start_time = %s AND status != 'cancelled'",  
            (room_id, booking_date, start_time)  
        )  
        if cur.fetchone():  
            conn.close()  
            return {  
                'statusCode': 400,  
                'headers': { 'Access-Control-Allow-Origin': '*' },  
                'body': json.dumps({'success': False, 'error': 'This slot is already booked. Please choose another time.'})  
            }  

        # INSERT PENDING BOOKING  
        cur.execute(  
            "INSERT INTO bookings (id, room_id, customer_name, alias, customer_phone, booking_date, start_time, end_time, total_price, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",  
            (booking_id, room_id, customer_name, alias, customer_phone, booking_date, start_time, end_time, total_price, 'pending')  
        )  
    conn.commit()  
    conn.close()  
      
    # 2. CREATE ATOMIC LOCK IN DYNAMODB  
    lock_id = f"{room_id}#{booking_date}#{start_time}"  
    try:  
        table.put_item(  
            Item={  
                'lock_id': lock_id,  
                'room_id': room_id,  
                'alias': alias,  
                'expires_at': expires_at,  
                'session_token': session_token  
            },  
            ConditionExpression='attribute_not_exists(lock_id)'  
        )  
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:  
        return {  
            'statusCode': 400,  
            'headers': { 'Access-Control-Allow-Origin': '*' },  
            'body': json.dumps({'success': False, 'error': 'Slot was just taken by another user. Please refresh.'})  
        }  
      
    return {  
        'statusCode': 200,  
        'headers': { 'Access-Control-Allow-Origin': '*' },  
        'body': json.dumps({  
            'success': True,  
            'booking_id': booking_id,  
            'session_token': session_token,  
            'expires_at': expires_at,  
            'lock_id': lock_id  
        })  
    }  
except Exception as e:  
    return {  
        'statusCode': 500,  
        'headers': { 'Access-Control-Allow-Origin': '*' },  
        'body': json.dumps({'success': False, 'error': str(e)})  
    }

Kayak gini apa yang diubah??
