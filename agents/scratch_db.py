import psycopg2
from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables)

if "patientinterventions" not in tables:
    print("Creating patientinterventions table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS patientinterventions (
            intervention_id SERIAL PRIMARY KEY,
            customer_id INT UNIQUE NOT NULL,
            risk_score NUMERIC(5,4),
            risk_factors JSONB,
            care_plan JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_read BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
        );
    """)
    conn.commit()
    print("Table created.")

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='customer'")
columns = [r[0] for r in cur.fetchall()]
print("Customer columns:", columns)

if "risk_score" not in columns:
    print("Adding risk_score to Customer...")
    cur.execute('ALTER TABLE customer ADD COLUMN risk_score NUMERIC(5,4) DEFAULT 0.0;')
    conn.commit()
    print("Column added.")

conn.close()
