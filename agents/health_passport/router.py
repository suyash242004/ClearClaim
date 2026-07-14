import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from shared.db import save_customer_wallet, get_customer_wallet
from shared.blockchain import mint_passport, get_passport_data

router = APIRouter()

class LinkWalletRequest(BaseModel):
    customer_id: int
    wallet_address: str

class MintPassportRequest(BaseModel):
    customer_id: int
    wallet_address: str

@router.post("/agent/customer/wallet")
def link_wallet(request: LinkWalletRequest):
    """
    Links a customer ID to their wallet address in the PostgreSQL database.
    """
    try:
        save_customer_wallet(request.customer_id, request.wallet_address)
        return {"status": "success", "message": f"Linked customer #{request.customer_id} to wallet {request.wallet_address}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to link wallet: {str(e)}")

@router.post("/agent/health-passport/mint")
def mint_health_passport(request: MintPassportRequest):
    """
    Mints the on-chain Health Passport SBT using the agent's private key.
    """
    try:
        # First, ensure it's linked in the DB
        save_customer_wallet(request.customer_id, request.wallet_address)

        # Check if passport already exists
        existing = get_passport_data(request.wallet_address)
        if existing and existing.get("exists"):
            return {
                "status": "success",
                "message": "Health Passport already minted for this wallet.",
                "tx_hash": None
            }

        # Call blockchain to mint
        tx_hash = mint_passport(request.wallet_address, request.customer_id)
        if not tx_hash:
            raise HTTPException(status_code=500, detail="Blockchain transaction failed during passport minting.")
        
        return {
            "status": "success",
            "message": "Soul-Bound Health Passport minted successfully on X Layer Testnet!",
            "tx_hash": tx_hash
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agent/health-passport/{wallet_address}")
def get_passport(wallet_address: str):
    """
    Fetches the on-chain Health Passport SBT data directly from the contract.
    """
    try:
        data = get_passport_data(wallet_address)
        if not data:
            raise HTTPException(status_code=404, detail="No Health Passport found on-chain for this wallet address.")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
