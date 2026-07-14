/**
 * deploy.js — Deploy all 3 ClearClaim AI contracts to OKX X Layer Testnet
 *
 * Usage:
 *   cd web3
 *   npm install
 *   npx hardhat run scripts/deploy.js --network xlayer_testnet
 *
 * Requires web3/.env:
 *   AGENT_PRIVATE_KEY=0x...    Your OKX wallet private key (export from extension)
 *   AGENT_ADDRESS=0x...        Same wallet public address
 *   XLAYER_RPC=https://testrpc.xlayer.tech
 *
 * Get testnet OKB: https://www.okx.com/xlayer/faucet
 *
 * Contracts deployed:
 *   1. InsuranceClaim  — AI claim decisions audit trail
 *   2. RiskOracle      — Predictive risk scores
 *   3. HealthGuardian  — Proactive intervention records
 */
const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n🚀 ClearClaim AI — Multi-Contract Deployer");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:         X Layer Testnet (chainId 1952)");
  console.log("Deployer:        ", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:         ", ethers.formatEther(balance), "OKB");

  if (balance === 0n) {
    console.error("\n❌ Zero balance! Get testnet OKB from: https://www.okx.com/xlayer/faucet");
    process.exit(1);
  }

  const agentAddress = process.env.AGENT_ADDRESS || deployer.address;
  console.log("Agent wallet:    ", agentAddress);
  console.log("");

  const deployedAddresses = {};

  // ── 1. InsuranceClaim ─────────────────────────────────────────────────────
  console.log("📦 [1/3] Deploying InsuranceClaim.sol...");
  const InsuranceClaim = await ethers.getContractFactory("InsuranceClaim");
  const insuranceClaim = await InsuranceClaim.deploy(agentAddress);
  await insuranceClaim.waitForDeployment();
  deployedAddresses.InsuranceClaim = await insuranceClaim.getAddress();
  console.log("   ✅ InsuranceClaim:", deployedAddresses.InsuranceClaim);
  console.log("   🔗", `https://explorer.xlayer.tech/address/${deployedAddresses.InsuranceClaim}`);

  // ── 2. RiskOracle ─────────────────────────────────────────────────────────
  console.log("\n📦 [2/3] Deploying RiskOracle.sol...");
  const RiskOracle = await ethers.getContractFactory("RiskOracle");
  const riskOracle = await RiskOracle.deploy(agentAddress);
  await riskOracle.waitForDeployment();
  deployedAddresses.RiskOracle = await riskOracle.getAddress();
  console.log("   ✅ RiskOracle:     ", deployedAddresses.RiskOracle);
  console.log("   🔗", `https://explorer.xlayer.tech/address/${deployedAddresses.RiskOracle}`);

  // ── 3. HealthGuardian ─────────────────────────────────────────────────────
  console.log("\n📦 [3/4] Deploying HealthGuardian.sol...");
  const HealthGuardian = await ethers.getContractFactory("HealthGuardian");
  const healthGuardian = await HealthGuardian.deploy(agentAddress);
  await healthGuardian.waitForDeployment();
  deployedAddresses.HealthGuardian = await healthGuardian.getAddress();
  console.log("   ✅ HealthGuardian: ", deployedAddresses.HealthGuardian);
  console.log("   🔗", `https://explorer.xlayer.tech/address/${deployedAddresses.HealthGuardian}`);

  // ── 4. HealthPassport ─────────────────────────────────────────────────────
  console.log("\n📦 [4/4] Deploying HealthPassport.sol...");
  const HealthPassport = await ethers.getContractFactory("HealthPassport");
  const healthPassport = await HealthPassport.deploy(agentAddress);
  await healthPassport.waitForDeployment();
  deployedAddresses.HealthPassport = await healthPassport.getAddress();
  console.log("   ✅ HealthPassport: ", deployedAddresses.HealthPassport);
  console.log("   🔗", `https://explorer.xlayer.tech/address/${deployedAddresses.HealthPassport}`);

  // ── Save deployment info ──────────────────────────────────────────────────
  const deployment = {
    network:         "X Layer Testnet",
    chainId:         1952,
    deployer:        deployer.address,
    agentAddress:    agentAddress,
    timestamp:       new Date().toISOString(),
    contracts:       deployedAddresses,
    explorer:        "https://explorer.xlayer.tech",
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deployment, null, 2)
  );

  // ── Print env vars to copy ────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ All 4 contracts deployed!");
  console.log("\n📋 Copy these into agents/.env:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`CONTRACT_ADDRESS=${deployedAddresses.InsuranceClaim}`);
  console.log(`RISK_ORACLE_ADDRESS=${deployedAddresses.RiskOracle}`);
  console.log(`HEALTH_GUARDIAN_ADDRESS=${deployedAddresses.HealthGuardian}`);
  console.log(`HEALTH_PASSPORT_ADDRESS=${deployedAddresses.HealthPassport}`);
  console.log("\n📋 Then run:");
  console.log("   node scripts/extract_abi.js");
  console.log("   python main.py");
  console.log("\n🎯 Deployment saved to: web3/deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deployment failed:", err.message);
    process.exit(1);
  });
