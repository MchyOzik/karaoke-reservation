import json
import os
import psycopg2
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
lock_table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def get_db_connection():
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASS']
    )

def lambda_handler(event, context):
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 1. FETCH CONFIRMED BOOKINGS FROM POSTGRES
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT b.start_time, b.end_time, r.name, b.alias, b.status 
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                WHERE b.booking_date = %s AND b.status IN ('pending', 'confirmed')
                ORDER BY b.start_time ASC
            """, (today,))
            rows = cur.fetchall()
        conn.close()

        results = []
        for r in rows:
            results.append({
                'status': '✅ Confirmed' if r[4] == 'confirmed' else '⏳ Pending Payment',
                'start_time': str(r[0]),
                'end_time': str(r[1]),
                'room_name': r[2],
                'alias': r[3]
            })

        # 2. FETCH ACTIVE LOCKS FROM DYNAMODB
        locks = lock_table.scan()['Items']
        # Note: In production, filter locks by today's date in lock_id
        for l in locks:
            # Skip if this lock is already represented as 'pending' in Postgres
            # For simplicity in this demo, we just show them as '🔒 Locked'
            parts = l['lock_id'].split('#')
            if parts[1] == today:
                # Basic check to avoid duplicates with pending bookings
                exists = any(res['start_time'].startswith(parts[2]) and res['room_name'] in l['lock_id'] for res in results)
                if not exists:
                    results.append({
                        'status': '🔒 Temporary Lock',
                        'start_time': parts[2],
                        'end_time': f"{int(parts[2][:2])+1:02d}:00", # Assume 1 hour for lock display
                        'room_name': f"Room ID: {l['room_id']}",
                        'alias': l.get('alias', 'Anonymous')
                    })

        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'bookings': results})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'error': str(e)})
        }
