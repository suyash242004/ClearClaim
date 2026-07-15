const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

/**
 * RiskOracle — tamper-proof timeline of AI predictive risk scores.
 * Tests run on the in-process Hardhat network only (never X Layer).
 */
describe("RiskOracle", function () {
  async function deployFixture() {
    const [owner, agent, stranger] = await ethers.getSigners();
    const RiskOracle = await ethers.getContractFactory("RiskOracle");
    const oracle = await RiskOracle.deploy(agent.address);
    return { oracle, owner, agent, stranger };
  }

  const hash = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));

  describe("Deployment", function () {
    it("sets owner and agent address", async function () {
      const { oracle, owner, agent } = await loadFixture(deployFixture);
      expect(await oracle.owner()).to.equal(owner.address);
      expect(await oracle.agentAddress()).to.equal(agent.address);
    });

    it("starts with zero customers scanned", async function () {
      const { oracle } = await loadFixture(deployFixture);
      expect(await oracle.totalCustomersScanned()).to.equal(0);
    });
  });

  describe("recordRiskScore", function () {
    it("records a score and emits RiskScored", async function () {
      const { oracle, agent } = await loadFixture(deployFixture);
      const condHash = hash('["type-2 diabetes","hypertension"]');

      await expect(oracle.connect(agent).recordRiskScore(11, 7200, 2, condHash, true))
        .to.emit(oracle, "RiskScored")
        .withArgs(11, 7200, 2, true, anyValue);

      const latest = await oracle.getLatestRisk(11);
      expect(latest.riskScoreBps).to.equal(7200);
      expect(latest.riskLevel).to.equal(2);
      expect(latest.guardianTriggered).to.equal(true);
      expect(latest.timestamp).to.be.gt(0);

      expect(await oracle.totalCustomersScanned()).to.equal(1);
      expect(await oracle.getRiskHistoryLength(11)).to.equal(1);
    });

    it("appends to history and updates latest on rescan of same customer", async function () {
      const { oracle, agent } = await loadFixture(deployFixture);
      await oracle.connect(agent).recordRiskScore(11, 3000, 0, hash("c1"), false);
      await oracle.connect(agent).recordRiskScore(11, 8100, 2, hash("c2"), true);

      // customer counted once, but full timeline preserved
      expect(await oracle.totalCustomersScanned()).to.equal(1);
      expect(await oracle.getRiskHistoryLength(11)).to.equal(2);

      const latest = await oracle.getLatestRisk(11);
      expect(latest.riskScoreBps).to.equal(8100);
      expect(latest.guardianTriggered).to.equal(true);

      // first history entry still holds the original score
      const first = await oracle.riskHistory(11, 0);
      expect(first.riskScoreBps).to.equal(3000);
      expect(first.riskLevel).to.equal(0);
    });

    it("tracks distinct customers", async function () {
      const { oracle, agent } = await loadFixture(deployFixture);
      await oracle.connect(agent).recordRiskScore(1, 1000, 0, hash("a"), false);
      await oracle.connect(agent).recordRiskScore(2, 5000, 1, hash("b"), false);
      expect(await oracle.totalCustomersScanned()).to.equal(2);
      expect(await oracle.scannedCustomerIds(0)).to.equal(1);
      expect(await oracle.scannedCustomerIds(1)).to.equal(2);
    });

    it("accepts boundary values (0 bps / 10000 bps, level 0-2)", async function () {
      const { oracle, agent } = await loadFixture(deployFixture);
      await oracle.connect(agent).recordRiskScore(1, 0, 0, hash("min"), false);
      await oracle.connect(agent).recordRiskScore(2, 10000, 2, hash("max"), true);
      expect((await oracle.getLatestRisk(2)).riskScoreBps).to.equal(10000);
    });

    it("reverts when risk score exceeds 10000 bps", async function () {
      const { oracle, agent } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(agent).recordRiskScore(1, 10001, 1, hash("x"), false)
      ).to.be.revertedWith("Risk score must be 0-10000 bps");
    });

    it("reverts when risk level exceeds 2", async function () {
      const { oracle, agent } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(agent).recordRiskScore(1, 5000, 3, hash("x"), false)
      ).to.be.revertedWith("Risk level must be 0, 1, or 2");
    });

    it("reverts for unauthorized callers", async function () {
      const { oracle, stranger } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(stranger).recordRiskScore(1, 5000, 1, hash("x"), false)
      ).to.be.revertedWith("Unauthorized");
    });

    it("allows the owner to record as well (owner passes onlyAgent)", async function () {
      const { oracle, owner } = await loadFixture(deployFixture);
      await oracle.connect(owner).recordRiskScore(9, 4500, 1, hash("owner scan"), false);
      expect((await oracle.getLatestRisk(9)).riskScoreBps).to.equal(4500);
    });
  });

  describe("getLatestRisk", function () {
    it("reverts for a customer that was never scanned", async function () {
      const { oracle } = await loadFixture(deployFixture);
      await expect(oracle.getLatestRisk(404)).to.be.revertedWith(
        "No risk record for this customer"
      );
    });
  });

  describe("setAgentAddress", function () {
    it("owner can rotate the agent", async function () {
      const { oracle, owner, agent, stranger } = await loadFixture(deployFixture);
      await oracle.connect(owner).setAgentAddress(stranger.address);
      expect(await oracle.agentAddress()).to.equal(stranger.address);
      await expect(
        oracle.connect(agent).recordRiskScore(1, 100, 0, hash("x"), false)
      ).to.be.revertedWith("Unauthorized");
    });

    it("non-owner cannot rotate the agent", async function () {
      const { oracle, stranger } = await loadFixture(deployFixture);
      await expect(oracle.connect(stranger).setAgentAddress(stranger.address))
        .to.be.revertedWith("Only owner");
    });
  });
});
