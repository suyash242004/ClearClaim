import psycopg2
import sys
import os
from shared.db import get_db_connection

def run_sql_file(filename):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        with open(filename, 'r', encoding='utf-8') as f:
            sql = f.read()
        cur.execute(sql)
        conn.commit()
        print(f"Successfully executed {filename}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_sql_file(sys.argv[1])
