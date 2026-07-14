import os
import json
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure we have web3 installed
try:
    from web3 import Web3
except ImportError:
    print("❌ Error: 'web3' library not found. Please run: pip install web3")
    sys.exit(1)

# ── 1. Setup & Config ────────────────────────────────────────────────────────
project_root = Path(__file__).resolve().parent
load_dotenv(project_root / ".env")

RPC_URL = os.getenv("XLAYER_RPC", "https://testrpc.xlayer.tech")
INSURANCE_CLAIM_ADDR = os.getenv("CONTRACT_ADDRESS")
RISK_ORACLE_ADDR = os.getenv("RISK_ORACLE_ADDRESS")
HEALTH_GUARDIAN_ADDR = os.getenv("HEALTH_GUARDIAN_ADDRESS")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

if not w3.is_connected():
    print(f"❌ Failed to connect to X Layer Testnet at {RPC_URL}")
    sys.exit(1)

# ── 2. Load ABIs ────────────────────────────────────────────────────────────
def load_abi(name):
    path = project_root.parent / "web3" / "abi" / f"{name}.json"
    if path.exists():
        with open(path, "r") as f:
            return json.load(f)["abi"]
    return []

contracts = {}
if INSURANCE_CLAIM_ADDR:
    contracts[INSURANCE_CLAIM_ADDR.lower()] = w3.eth.contract(address=w3.to_checksum_address(INSURANCE_CLAIM_ADDR), abi=load_abi("InsuranceClaim"))
if RISK_ORACLE_ADDR:
    contracts[RISK_ORACLE_ADDR.lower()] = w3.eth.contract(address=w3.to_checksum_address(RISK_ORACLE_ADDR), abi=load_abi("RiskOracle"))
if HEALTH_GUARDIAN_ADDR:
    contracts[HEALTH_GUARDIAN_ADDR.lower()] = w3.eth.contract(address=w3.to_checksum_address(HEALTH_GUARDIAN_ADDR), abi=load_abi("HealthGuardian"))

# ── 3. CLI Logic ────────────────────────────────────────────────────────────
def main():
    print("\n🔍 ClearClaim AI — X Layer Transaction Decoder")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    if len(sys.argv) < 2:
        tx_hash = input("Paste your Transaction Hash (0x...): ").strip()
    else:
        tx_hash = sys.argv[1].strip()

    if not tx_hash.startswith("0x"):
        print("❌ Invalid transaction hash.")
        return

    print(f"\n📡 Fetching transaction from X Layer Testnet...")
    try:
        tx = w3.eth.get_transaction(tx_hash)
    except Exception as e:
        print(f"❌ Could not find transaction. Make sure it's on the Testnet. Error: {e}")
        return

    to_address = tx["to"].lower() if tx["to"] else None
    contract = contracts.get(to_address)

    print("\n✅ Transaction Found!")
    print(f"   From:   {tx['from']}")
    print(f"   To:     {tx['to']}")

    if not contract:
        print("\n⚠️  This transaction was sent to an unknown contract address.")
        print(f"   Raw Input Data: {tx['input'].hex()}")
        return

    print(f"\n🧠 Decoding AI Smart Contract Data...")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    try:
        # Decode the hex input data using the ABI
        func_obj, func_params = contract.decode_function_input(tx["input"])
        
        print(f"🟢 Function Executed: {func_obj.fn_name}")
        print("\n📊 Decoded Parameters:")
        
        for param_name, param_value in func_params.items():
            # Format the output beautifully based on the data type
            if "Hash" in param_name:
                display_value = f"0x{param_value.hex()}" if isinstance(param_value, bytes) else param_value
            elif "Bps" in param_name:
                display_value = f"{param_value} (which means {(param_value / 10000) * 100}% Risk)"
            elif param_name == "riskLevel":
                levels = {0: "Low", 1: "Medium", 2: "High"}
                display_value = f"{param_value} ({levels.get(param_value, 'Unknown')})"
            else:
                display_value = param_value
                
            print(f"   ➤ {param_name.ljust(20)} : {display_value}")
            
    except Exception as e:
        print(f"❌ Failed to decode input data: {e}")
        print(f"   Raw Input Data: {tx['input'].hex()}")
        
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

if __name__ == "__main__":
    main()
