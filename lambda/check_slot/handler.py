import json
import os
import psycopg2
import boto3

dynamodb = boto3.resource('dynamodb')
lock_table = dynamodb.Table(os.environ.get('DYNAMODB_TABLE', 'karaoke-reservation-session-locks'))

def get_db_connection():
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASS']
    )

def lambda_handler(event, context):
    try:
        params = event.get('queryStringParameters', {})
        room_id = params.get('room_id')
        date = params.get('date')
        
        if not room_id or not date:
            return { 'statusCode': 400, 'body': json.dumps({'error': 'Missing required parameters'}) }

        # 1. CHECK DYNAMODB FOR ACTIVE LOCKS
        locks = lock_table.scan()['Items']
        locked_slots = []
        for l in locks:
            # lock_id format: room_id#date#start_time
            parts = l['lock_id'].split('#')
            if parts[0] == str(room_id) and parts[1] == date:
                locked_slots.append(parts[2])

        # 2. CHECK POSTGRES FOR CONFIRMED BOOKINGS
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT start_time FROM bookings WHERE room_id = %s AND booking_date = %s AND status != 'cancelled'",
                (room_id, date)
            )
            rows = cur.fetchall()
        conn.close()
        
        booked_slots = [str(r[0])[:5] for r in rows] # HH:MM format
        
        # COMBINE BOTH SOURCES
        all_unavailable = list(set(booked_slots + locked_slots))

        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({
                'success': True,
                'unavailable_slots': all_unavailable
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'success': False, 'error': str(e)})
        }
