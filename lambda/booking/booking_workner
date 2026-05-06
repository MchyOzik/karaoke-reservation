import json
import os
import uuid
import time
import psycopg2
import boto3

# DynamoDB
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

# RDS connection
def get_db_connection():
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASS']
    )

def lambda_handler(event, context):
    for record in event['Records']:
        try:
            body = json.loads(record['body'])

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
            expires_at = int(time.time()) + 900

            lock_id = f"{room_id}#{booking_date}#{start_time}"

            # 🔥 1. LOCK DULU (ANTI DOUBLE BOOKING)
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
                print("Slot sudah diambil (lock gagal)")
                continue

            # 🔹 2. INSERT KE POSTGRES
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO bookings (id, room_id, customer_name, alias, customer_phone, booking_date, start_time, end_time, total_price, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (
                            booking_id, room_id, customer_name, alias,
                            customer_phone, booking_date,
                            start_time, end_time,
                            total_price, 'pending'
                        )
                    )
                conn.commit()
            finally:
                conn.close()

            print("Booking berhasil:", booking_id)

        except Exception as e:
            print("Error:", str(e))
