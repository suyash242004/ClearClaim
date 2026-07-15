import os
from dotenv import load_dotenv

load_dotenv(override=True)

GEMINI_API_KEY_STR = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEYS = [k.strip() for k in GEMINI_API_KEY_STR.split(",")] if GEMINI_API_KEY_STR else []
GEMINI_API_KEY = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else ""
DB_HOST        = os.getenv("DB_HOST", "localhost")
DB_PORT        = os.getenv("DB_PORT", "5432")
DB_NAME        = os.getenv("DB_NAME", "medical_insurance")
DB_USER        = os.getenv("DB_USER", "postgres")
DB_PASSWORD    = os.getenv("DB_PASSWORD", "")
READ_API       = os.getenv("READ_API",  "http://localhost:5234")
WRITE_API      = os.getenv("WRITE_API", "http://localhost:5130")

# X Layer — DEPLOYED ✅
XLAYER_RPC               = os.getenv("XLAYER_RPC", "https://testrpc.xlayer.tech")
AGENT_PRIVATE_KEY        = os.getenv("AGENT_PRIVATE_KEY", "")
AGENT_WALLET_ADDRESS     = os.getenv("AGENT_WALLET_ADDRESS", "0x98682146fC566C9304Dd57aF9b5C2115aF537A6f")
CONTRACT_ADDRESS         = os.getenv("CONTRACT_ADDRESS",        "0xB0Df35C3097B680B0e0D96721eaf2C012B8E447C")
RISK_ORACLE_ADDRESS      = os.getenv("RISK_ORACLE_ADDRESS",     "0xD1CAF7812321B0cf3F8568079F213042D8e284f6")
HEALTH_GUARDIAN_ADDRESS  = os.getenv("HEALTH_GUARDIAN_ADDRESS", "0x07Fc775Aa387e0E8b71dB1053fF3977ec0a8302f")
HEALTH_PASSPORT_ADDRESS  = os.getenv("HEALTH_PASSPORT_ADDRESS", "")
PREMIUM_VAULT_ADDRESS    = os.getenv("PREMIUM_VAULT_ADDRESS", "")

# gemini-3.5-flash: best JSON reliability + speed for adjudication (paid tier).
# Override with MODEL_NAME in .env; falls back to 2.5-flash if unavailable.
MODEL_NAME          = os.getenv("MODEL_NAME", "gemini-3.5-flash")
FALLBACK_MODEL_NAME = os.getenv("FALLBACK_MODEL_NAME", "gemini-2.5-flash")
