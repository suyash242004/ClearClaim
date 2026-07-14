import psycopg2
from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
cur = conn.cursor()
cur.execute("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name='customer'")
print("Columns:", cur.fetchall())

try:
    cur.execute("""
        INSERT INTO customer (customer_name, customer_email, customer_phone, password, age, gender, city, profession, blood_group, historical_disease, risk_score)
        VALUES ('test', 'test@test.com', '12345', 'pass', 30, 'Other', 'Unknown', 'Unknown', 'O+ve', 'None', 0.0)
    """)
    conn.commit()
    print("Insert succeeded!")
except Exception as e:
    print("Insert failed:", str(e))

conn.close()
