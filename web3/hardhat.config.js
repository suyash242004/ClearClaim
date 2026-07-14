require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || "";
const XLAYER_RPC  = process.env.XLAYER_RPC || "https://testrpc.xlayer.tech";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // OKX X Layer Testnet — chainId 1952
    xlayer_testnet: {
      url:      XLAYER_RPC,
      chainId:  1952,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // OKX X Layer Mainnet — chainId 196 (use after hackathon)
    xlayer_mainnet: {
      url:      "https://rpc.xlayer.tech",
      chainId:  196,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Optional: verify contracts on X Layer explorer
  etherscan: {
    apiKey: {
      xlayer_testnet: process.env.XLAYER_EXPLORER_API_KEY || "NO_KEY",
    },
    customChains: [
      {
        network: "xlayer_testnet",
        chainId: 1952,
        urls: {
          apiURL:     "https://explorer.xlayer.tech/api",
          browserURL: "https://explorer.xlayer.tech",
        },
      },
    ],
  },
};
