"""
agents/shared/blockchain.py — Python → X Layer Blockchain Bridge

Calls all 3 ClearClaim AI smart contracts after agent decisions:
  1. InsuranceClaim.recordDecision()   — after every AI claim adjudication
  2. RiskOracle.recordRiskScore()      — after every predictive risk scan
  3. HealthGuardian.recordIntervention() — after every care plan generation

Uses web3.py — pure Python, no Node.js subprocess needed.

Required env vars in agents/.env:
  XLAYER_RPC               e.g. https://testrpc.xlayer.tech
  AGENT_PRIVATE_KEY        0x... (export from OKX Wallet extension)
  AGENT_WALLET_ADDRESS     0x... (same wallet, public address)
  CONTRACT_ADDRESS         0x... (InsuranceClaim deployed address)
  RISK_ORACLE_ADDRESS      0x... (RiskOracle deployed address)
  HEALTH_GUARDIAN_ADDRESS  0x... (HealthGuardian deployed address)

ABI files loaded from web3/abi/ (produced by extract_abi.js after compile)
"""
import os
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("clearclaim.blockchain")

# ── Load from config (which loads .env) ──────────────────────────────────────
from shared.config import (
    XLAYER_RPC, AGENT_PRIVATE_KEY,
    CONTRACT_ADDRESS, RISK_ORACLE_ADDRESS, HEALTH_GUARDIAN_ADDRESS, HEALTH_PASSPORT_ADDRESS
)

# ── Minimal fallback ABIs (used if abi/ files not built yet) ──────────────────
_CLAIM_ABI_MIN = [{"inputs": [{"internalType": "uint256","name": "claimId","type": "uint256"},{"internalType": "string","name": "decision","type": "string"},{"internalType": "bytes32","name": "reasoningHash","type": "bytes32"},{"internalType": "uint8","name": "confidencePercent","type": "uint8"}],"name": "recordDecision","outputs": [],"stateMutability": "nonpayable","type": "function"}]
_RISK_ABI_MIN  = [{"inputs": [{"internalType": "uint256","name": "customerId","type": "uint256"},{"internalType": "uint256","name": "riskScoreBps","type": "uint256"},{"internalType": "uint8","name": "riskLevel","type": "uint8"},{"internalType": "bytes32","name": "conditionsHash","type": "bytes32"},{"internalType": "bool","name": "guardianTriggered","type": "bool"}],"name": "recordRiskScore","outputs": [],"stateMutability": "nonpayable","type": "function"}]
_GUARD_ABI_MIN = [{"inputs": [{"internalType": "uint256","name": "customerId","type": "uint256"},{"internalType": "uint256","name": "riskScoreBps","type": "uint256"},{"internalType": "bytes32","name": "carePlanHash","type": "bytes32"},{"internalType": "bytes32","name": "riskFactorsHash","type": "bytes32"}],"name": "recordIntervention","outputs": [],"stateMutability": "nonpayable","type": "function"}]
_PASSPORT_ABI_MIN = [
    {"inputs": [{"internalType": "address", "name": "wallet", "type": "address"}, {"internalType": "uint256", "name": "customerId", "type": "uint256"}], "name": "mintPassport", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "address", "name": "wallet", "type": "address"}, {"internalType": "bool", "name": "approved", "type": "bool"}], "name": "recordClaimOnPassport", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "address", "name": "wallet", "type": "address"}, {"internalType": "uint256", "name": "riskBps", "type": "uint256"}, {"internalType": "uint8", "name": "riskLevel", "type": "uint8"}], "name": "updateRiskOnPassport", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "address", "name": "wallet", "type": "address"}, {"internalType": "bool", "name": "active", "type": "bool"}], "name": "updateGuardianOnPassport", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "address", "name": "", "type": "address"}], "name": "passports", "outputs": [{"internalType": "uint256", "name": "customerId", "type": "uint256"}, {"internalType": "uint256", "name": "mintedAt", "type": "uint256"}, {"internalType": "uint256", "name": "totalClaims", "type": "uint256"}, {"internalType": "uint256", "name": "approvedClaims", "type": "uint256"}, {"internalType": "uint256", "name": "latestRiskBps", "type": "uint256"}, {"internalType": "uint8", "name": "latestRiskLevel", "type": "uint8"}, {"internalType": "bool", "name": "guardianActive", "type": "bool"}, {"internalType": "bool", "name": "exists", "type": "bool"}], "stateMutability": "view", "type": "function"}
]


def _load_abi(contract_name: str, fallback: list) -> list:
    """Load ABI from web3/abi/, fallback to inline minimal ABI."""
    project_root = Path(__file__).resolve().parent.parent.parent
    abi_path = project_root / "web3" / "abi" / f"{contract_name}.json"
    if abi_path.exists():
        try:
            return json.loads(abi_path.read_text()).get("abi", fallback)
        except Exception:
            pass
    return fallback


def _get_web3_and_account():
    """Returns (w3, account) or (None, None) if unavailable."""
    if not AGENT_PRIVATE_KEY:
        logger.info("[Blockchain] AGENT_PRIVATE_KEY not set — skipping onchain write.")
        return None, None
    try:
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(XLAYER_RPC))
        if not w3.is_connected():
            logger.warning(f"[Blockchain] Cannot connect to {XLAYER_RPC}")
            return None, None
        account = w3.eth.account.from_key(AGENT_PRIVATE_KEY)
        return w3, account
    except ImportError:
        logger.warning("[Blockchain] web3 not installed. Run: pip install web3")
        return None, None
    except Exception as e:
        logger.error(f"[Blockchain] Setup failed: {e}")
        return None, None


def _send_tx(w3, account, contract, fn_call) -> Optional[str]:
    """Signs, sends, and waits for a transaction. Returns tx hash or None."""
    try:
        from web3 import Web3
        nonce = w3.eth.get_transaction_count(account.address)
        tx = fn_call.build_transaction({
            "from":     account.address,
            "nonce":    nonce,
            "gas":      1_000_000,
            "gasPrice": w3.eth.gas_price,
            "chainId":  w3.eth.chain_id,   # X Layer testnet migrated 195 → 1952
        })
        signed  = w3.eth.account.sign_transaction(tx, AGENT_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt.status == 1:
            return receipt.transactionHash.hex()
        logger.warning(f"[Blockchain] TX failed (status=0): {tx_hash.hex()}")
        return None
    except Exception as e:
        logger.error(f"[Blockchain] TX error: {e}")
        return None


# ── Internal Helpers for Passport Auto-Update ────────────────────────────────
def _get_customer_wallet_by_claim(claim_id: int) -> Optional[str]:
    try:
        from shared.db import get_db_connection
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('''
                SELECT c.wallet_address FROM claims cl
                JOIN policys p ON cl.policy_id = p.policy_id
                JOIN customer c ON p.customer_id = c.customer_id
                WHERE cl.claim_id = %s
            ''', (claim_id,))
            row = cur.fetchone()
            return row[0] if row else None
    except Exception:
        return None
    finally:
        if 'conn' in locals():
            conn.close()

def _get_customer_wallet(customer_id: int) -> Optional[str]:
    try:
        from shared.db import get_db_connection
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT wallet_address FROM customer WHERE customer_id = %s', (customer_id,))
            row = cur.fetchone()
            return row[0] if row else None
    except Exception:
        return None
    finally:
        if 'conn' in locals():
            conn.close()

# ── Public functions ──────────────────────────────────────────────────────────

def record_claim_decision(
    claim_id: int,
    decision: str,
    reasoning: str,
    confidence_percent: int,
) -> Optional[str]:
    """
    Writes an AI claim decision to InsuranceClaim.sol on X Layer.
    Called by Claim Processor (Agent 1) and Orchestrator (Agent 4).
    Returns tx hash or None if blockchain unavailable.
    """
    if not CONTRACT_ADDRESS:
        logger.info("[Blockchain] CONTRACT_ADDRESS not set — skipping InsuranceClaim write.")
        return None

    w3, account = _get_web3_and_account()
    if not w3:
        return None

    try:
        from web3 import Web3
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS),
            abi=_load_abi("InsuranceClaim", _CLAIM_ABI_MIN),
        )
        reasoning_hash = w3.keccak(text=reasoning)
        fn = contract.functions.recordDecision(
            claim_id, decision, reasoning_hash, min(confidence_percent, 100)
        )
        tx_hash = _send_tx(w3, account, contract, fn)
        if tx_hash:
            logger.info(f"[Blockchain] Claim #{claim_id} → {decision} | TX: {tx_hash[:18]}…")
            # Auto-update passport if wallet is linked
            wallet = _get_customer_wallet_by_claim(claim_id)
            if wallet:
                record_claim_on_passport(wallet, approved=(decision == "Approve"))
        return tx_hash
    except Exception as e:
        logger.error(f"[Blockchain] record_claim_decision failed: {e}")
        return None


def record_risk_score(
    customer_id: int,
    risk_score: float,
    risk_level: str,
    predicted_conditions: list,
    guardian_triggered: bool,
) -> Optional[str]:
    """
    Writes a predictive risk score to RiskOracle.sol.
    Called by Predictive Risk Agent (Agent 5).
    """
    if not RISK_ORACLE_ADDRESS:
        logger.info("[Blockchain] RISK_ORACLE_ADDRESS not set — skipping RiskOracle write.")
        return None

    w3, account = _get_web3_and_account()
    if not w3:
        return None

    try:
        from web3 import Web3
        risk_score_bps = int(min(risk_score, 1.0) * 10000)
        risk_level_int = {"Low": 0, "Medium": 1, "High": 2}.get(risk_level, 1)
        conditions_hash = w3.keccak(text=json.dumps(sorted(predicted_conditions)))

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(RISK_ORACLE_ADDRESS),
            abi=_load_abi("RiskOracle", _RISK_ABI_MIN),
        )
        fn = contract.functions.recordRiskScore(
            customer_id, risk_score_bps, risk_level_int,
            conditions_hash, guardian_triggered
        )
        tx_hash = _send_tx(w3, account, contract, fn)
        if tx_hash:
            logger.info(
                f"[Blockchain] Customer #{customer_id} risk {risk_score:.2f} ({risk_level}) "
                f"{'+ Guardian triggered' if guardian_triggered else ''} | TX: {tx_hash[:18]}…"
            )
            # Auto-update passport if wallet is linked
            wallet = _get_customer_wallet(customer_id)
            if wallet:
                update_risk_on_passport(wallet, risk_score_bps, risk_level_int)
        return tx_hash
    except Exception as e:
        logger.error(f"[Blockchain] record_risk_score failed: {e}")
        return None


def record_intervention(
    customer_id: int,
    risk_score: float,
    care_plan: dict,
    risk_factors: list,
) -> Optional[str]:
    """
    Writes a Health Guardian intervention to HealthGuardian.sol.
    Called by Health Guardian Agent (Agent 6).
    This is the most unique onchain record — proves AI acted proactively.
    """
    if not HEALTH_GUARDIAN_ADDRESS:
        logger.info("[Blockchain] HEALTH_GUARDIAN_ADDRESS not set — skipping HealthGuardian write.")
        return None

    w3, account = _get_web3_and_account()
    if not w3:
        return None

    try:
        from web3 import Web3
        risk_score_bps   = int(min(risk_score, 1.0) * 10000)
        care_plan_hash   = w3.keccak(text=json.dumps(care_plan, sort_keys=True))
        risk_factors_hash = w3.keccak(text=json.dumps(sorted(risk_factors)))

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(HEALTH_GUARDIAN_ADDRESS),
            abi=_load_abi("HealthGuardian", _GUARD_ABI_MIN),
        )
        fn = contract.functions.recordIntervention(
            customer_id, risk_score_bps, care_plan_hash, risk_factors_hash
        )
        tx_hash = _send_tx(w3, account, contract, fn)
        if tx_hash:
            logger.info(
                f"[Blockchain] Health Guardian: Customer #{customer_id} "
                f"risk {risk_score:.2f} | TX: {tx_hash[:18]}…"
            )
            # Auto-update passport if wallet is linked
            wallet = _get_customer_wallet(customer_id)
            if wallet:
                update_guardian_on_passport(wallet, active=True)
        return tx_hash
    except Exception as e:
        logger.error(f"[Blockchain] record_intervention failed: {e}")
        return None

def mint_passport(wallet_address: str, customer_id: int) -> Optional[str]:
    """Mints a Health Passport soulbound token for a patient."""
    if not HEALTH_PASSPORT_ADDRESS:
        logger.info("[Blockchain] HEALTH_PASSPORT_ADDRESS not set — skipping mint.")
        return None
    w3, account = _get_web3_and_account()
    if not w3:
        return None
    try:
        from web3 import Web3
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(HEALTH_PASSPORT_ADDRESS),
            abi=_load_abi("HealthPassport", _PASSPORT_ABI_MIN),
        )
        fn = contract.functions.mintPassport(Web3.to_checksum_address(wallet_address), customer_id)
        tx_hash = _send_tx(w3, account, contract, fn)
        if tx_hash:
            logger.info(f"[Blockchain] Health Passport Minted for wallet {wallet_address} | TX: {tx_hash[:18]}…")
        return tx_hash
    except Exception as e:
        logger.error(f"[Blockchain] mint_passport failed: {e}")
        return None

def record_claim_on_passport(wallet_address: str, approved: bool) -> Optional[str]:
    """Records a claim event on the patient's soulbound passport."""
    if not HEALTH_PASSPORT_ADDRESS:
        return None
    w3, account = _get_web3_and_account()
    if not w3:
        return None
    try:
        from web3 import Web3
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(HEALTH_PASSPORT_ADDRESS),
            abi=_load_abi("HealthPassport", _PASSPORT_ABI_MIN),
        )
        fn = contract.functions.recordClaimOnPassport(Web3.to_checksum_address(wallet_address), approved)
        tx_hash = _send_tx(w3, account, contract, fn)
        return tx_hash
    except Exception as e:
        logger.error(f"[Blockchain] record_claim_on_passport failed: {e}")
        return None

def update_risk_on_passport(wallet_address: str, risk_score: float, risk_level: str) -> Optional[str]:
    """Updates the patient's latest risk score on their passport contract."""
    if not HEALTH_PASSPORT_ADDRESS:
        return None
    w3, account = _get_web3_and_account()
    if not w3:
        return None
    try:
        from web3 import Web3
        risk_bps = int(min(risk_score, 1.0) * 10000)
        risk_level_int = {"Low": 0, "Medium": 1, "High": 2}.get(risk_level, 1)

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(HEALTH_PASSPORT_ADDRESS),
            abi=_load_abi("HealthPassport", _PASSPORT_ABI_MIN),
        )
        fn = contract.functions.updateRiskOnPassport(Web3.to_checksum_address(wallet_address), risk_bps, risk_level_int)
        tx_hash = _send_tx(w3, account, contract, fn)
        return tx_hash
    except Exception as e:
        logger.error(f"[Blockchain] update_risk_on_passport failed: {e}")
        return None

def update_guardian_on_passport(wallet_address: str, active: bool) -> Optional[str]:
    """Updates the Health Guardian status on the passport contract."""
    if not HEALTH_PASSPORT_ADDRESS:
        return None
    w3, account = _get_web3_and_account()
    if not w3:
        return None
    try:
        from web3 import Web3
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(HEALTH_PASSPORT_ADDRESS),
            abi=_load_abi("HealthPassport", _PASSPORT_ABI_MIN),
        )
        fn = contract.functions.updateGuardianOnPassport(Web3.to_checksum_address(wallet_address), active)
        tx_hash = _send_tx(w3, account, contract, fn)
        return tx_hash
    except Exception as e:
        logger.error(f"[Blockchain] update_guardian_on_passport failed: {e}")
        return None

def get_passport_data(wallet_address: str) -> Optional[dict]:
    """Reads passport data directly from the blockchain (free view call)."""
    if not HEALTH_PASSPORT_ADDRESS:
        return None
    try:
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(XLAYER_RPC))
        if not w3.is_connected():
            return None
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(HEALTH_PASSPORT_ADDRESS),
            abi=_load_abi("HealthPassport", _PASSPORT_ABI_MIN),
        )
        data = contract.functions.passports(Web3.to_checksum_address(wallet_address)).call()
        if not data[7]: # exists is index 7
            return None
        return {
            "customer_id": data[0],
            "minted_at": data[1],
            "total_claims": data[2],
            "approved_claims": data[3],
            "latest_risk_bps": data[4],
            "latest_risk_level": ["Low", "Medium", "High"][data[5]],
            "guardian_active": data[6],
            "exists": data[7]
        }
    except Exception as e:
        logger.error(f"[Blockchain] get_passport_data failed: {e}")
        return None
