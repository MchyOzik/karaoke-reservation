import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get('DB_HOST'),
        database=os.environ.get('DB_NAME'),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASS'),
        port=5432,
        connect_timeout=5
    )

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*'
        },
        'body': json.dumps(body, default=str)
    }

def lambda_handler(event, context):
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM rooms WHERE is_active = 1")
            rooms = cur.fetchall()
        conn.close()
        return cors_response(200, {'rooms': rooms})
    except Exception as e:
        print(f"Database Error: {e}")
        return cors_response(500, {'error': f"Database Connection Failed: {str(e)}", 'hint': 'Ensure RDS Security Group allows port 5432 from Lambda.'})
