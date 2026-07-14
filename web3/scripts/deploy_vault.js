const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PremiumVault with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const PremiumVault = await hre.ethers.getContractFactory("PremiumVault");
  const vault = await PremiumVault.deploy();
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("PremiumVault deployed to:", vaultAddress);

  // Read existing deployments if any
  const deployFile = path.join(__dirname, "../deployments.json");
  let deployments = {};
  if (fs.existsSync(deployFile)) {
    deployments = JSON.parse(fs.readFileSync(deployFile, "utf-8"));
  }

  // Update with new address (under the contracts map, matching deployments.json schema)
  if (!deployments.contracts) deployments.contracts = {};
  deployments.contracts.PremiumVault = vaultAddress;
  fs.writeFileSync(deployFile, JSON.stringify(deployments, null, 2));
  console.log("Updated deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
