/**
 * extract_abi.js — Extract ABIs from compiled artifacts → web3/abi/
 *
 * Run AFTER: npx hardhat compile
 * Usage:     node scripts/extract_abi.js
 *
 * Output:
 *   web3/abi/InsuranceClaim.json
 *   web3/abi/RiskOracle.json
 *   web3/abi/HealthGuardian.json
 *
 * The Python agents load these ABI files to call the contracts via web3.py
 */
const fs   = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts", "contracts");
const ABI_OUT_DIR   = path.join(__dirname, "..", "abi");

const CONTRACTS = ["InsuranceClaim", "RiskOracle", "HealthGuardian", "HealthPassport"];

if (!fs.existsSync(ABI_OUT_DIR)) {
  fs.mkdirSync(ABI_OUT_DIR, { recursive: true });
}

let allOk = true;

for (const name of CONTRACTS) {
  const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);

  if (!fs.existsSync(artifactPath)) {
    console.error(`❌ Artifact not found: ${artifactPath}`);
    console.error(`   Run 'npx hardhat compile' first.`);
    allOk = false;
    continue;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const outPath  = path.join(ABI_OUT_DIR, `${name}.json`);

  fs.writeFileSync(outPath, JSON.stringify({ abi: artifact.abi }, null, 2));
  console.log(`✅ ${name}.json → abi/${name}.json  (${artifact.abi.length} entries)`);
}

if (allOk) {
  console.log("\n🎯 All ABIs extracted. Python agents can now call the contracts.");
  console.log("   Next: update agents/.env with CONTRACT_ADDRESS, RISK_ORACLE_ADDRESS, HEALTH_GUARDIAN_ADDRESS");
} else {
  console.error("\n⚠️  Some ABIs failed. Run: npx hardhat compile --force");
}
