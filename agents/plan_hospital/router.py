"""
agents/plan_hospital/router.py — Plan-Hospital Mapping Utility
Used by the Admin DB Explorer to manage which hospitals are covered under which plans.
"""
from fastapi import APIRouter, HTTPException
import psycopg2
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from shared.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

router = APIRouter()


class PlanHospitalLink(BaseModel):
    plan_id: int
    hospital_id: int


@router.get("/agent/plan-hospital")
async def get_plan_hospital():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                SELECT ph.plan_id AS "planId", ph.hospital_id AS "hospitalId",
                       ip.plan_name AS "planName", h.hospital_name AS "hospitalName"
                FROM planhospital ph
                JOIN insuranceplan ip ON ph.plan_id = ip.plan_id
                JOIN hospital h ON ph.hospital_id = h.hospital_id
                ORDER BY ph.plan_id, ph.hospital_id
            ''')
            records = cur.fetchall()
            return {"records": [dict(r) for r in records]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/agent/plan-hospital")
async def add_plan_hospital(link: PlanHospitalLink):
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                'INSERT INTO planhospital (plan_id, hospital_id) VALUES (%s, %s)',
                (link.plan_id, link.hospital_id)
            )
            conn.commit()
            return {"record": {"planId": link.plan_id, "hospitalId": link.hospital_id}}
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail="This hospital is already linked to this plan, or the plan/hospital ID is invalid."
        )
    finally:
        conn.close()


@router.delete("/agent/plan-hospital/{plan_id}/{hospital_id}")
async def delete_plan_hospital(plan_id: int, hospital_id: int):
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                'DELETE FROM planhospital WHERE plan_id = %s AND hospital_id = %s',
                (plan_id, hospital_id)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Plan-Hospital link not found.")
            conn.commit()
            return {"message": "Hospital removed from plan successfully."}
    finally:
        conn.close()
