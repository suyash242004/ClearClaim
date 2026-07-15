const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

/**
 * HealthGuardian — immutable proof of proactive AI care interventions.
 * Tests run on the in-process Hardhat network only (never X Layer).
 */
describe("HealthGuardian", function () {
  async function deployFixture() {
    const [owner, agent, stranger] = await ethers.getSigners();
    const HealthGuardian = await ethers.getContractFactory("HealthGuardian");
    const guardian = await HealthGuardian.deploy(agent.address);
    return { guardian, owner, agent, stranger };
  }

  const hash = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));

  describe("Deployment", function () {
    it("sets owner and agent address", async function () {
      const { guardian, owner, agent } = await loadFixture(deployFixture);
      expect(await guardian.owner()).to.equal(owner.address);
      expect(await guardian.agentAddress()).to.equal(agent.address);
    });

    it("starts with zeroed aggregate stats", async function () {
      const { guardian } = await loadFixture(deployFixture);
      expect(await guardian.totalInterventions()).to.equal(0);
      expect(await guardian.highRiskInterventions()).to.equal(0);
      expect(await guardian.totalCustomersProtected()).to.equal(0);
    });
  });

  describe("recordIntervention", function () {
    it("records an intervention and emits InterventionRecorded", async function () {
      const { guardian, agent } = await loadFixture(deployFixture);
      const planHash = hash('{"plan":"quarterly cardiac screening"}');
      const factorsHash = hash('["smoking","bmi>30"]');

      await expect(guardian.connect(agent).recordIntervention(21, 8200, planHash, factorsHash))
        .to.emit(guardian, "InterventionRecorded")
        .withArgs(21, 8200, planHash, anyValue);

      const latest = await guardian.getLatestIntervention(21);
      expect(latest.riskScoreBps).to.equal(8200);
      expect(latest.carePlanHash).to.equal(planHash);
      expect(latest.timestamp).to.be.gt(0);

      expect(await guardian.totalInterventions()).to.equal(1);
      expect(await guardian.totalCustomersProtected()).to.equal(1);
    });

    it("counts high-risk interventions at the 7500 bps boundary (inclusive)", async function () {
      const { guardian, agent } = await loadFixture(deployFixture);
      await guardian.connect(agent).recordIntervention(1, 7499, hash("p1"), hash("f1"));
      expect(await guardian.highRiskInterventions()).to.equal(0);

      await guardian.connect(agent).recordIntervention(2, 7500, hash("p2"), hash("f2"));
      expect(await guardian.highRiskInterventions()).to.equal(1);

      expect(await guardian.totalInterventions()).to.equal(2);
    });

    it("repeat intervention for the same customer appends history but counts the customer once", async function () {
      const { guardian, agent } = await loadFixture(deployFixture);
      await guardian.connect(agent).recordIntervention(5, 6000, hash("v1"), hash("f"));
      await guardian.connect(agent).recordIntervention(5, 9000, hash("v2"), hash("f"));

      expect(await guardian.totalCustomersProtected()).to.equal(1);
      expect(await guardian.totalInterventions()).to.equal(2);

      const latest = await guardian.getLatestIntervention(5);
      expect(latest.riskScoreBps).to.equal(9000);
      expect(latest.carePlanHash).to.equal(hash("v2"));

      // original entry survives in interventionHistory
      const first = await guardian.interventionHistory(5, 0);
      expect(first.riskScoreBps).to.equal(6000);
    });

    it("reverts when risk score exceeds 10000 bps", async function () {
      const { guardian, agent } = await loadFixture(deployFixture);
      await expect(
        guardian.connect(agent).recordIntervention(1, 10001, hash("p"), hash("f"))
      ).to.be.revertedWith("Invalid risk score");
    });

    it("reverts for unauthorized callers", async function () {
      const { guardian, stranger } = await loadFixture(deployFixture);
      await expect(
        guardian.connect(stranger).recordIntervention(1, 5000, hash("p"), hash("f"))
      ).to.be.revertedWith("Unauthorized");
    });

    it("allows the owner to record as well (owner passes onlyAgent)", async function () {
      const { guardian, owner } = await loadFixture(deployFixture);
      await guardian.connect(owner).recordIntervention(3, 5000, hash("p"), hash("f"));
      expect(await guardian.totalInterventions()).to.equal(1);
    });
  });

  describe("verifyCarePlan", function () {
    it("verifies the original care plan JSON and rejects tampered JSON", async function () {
      const { guardian, agent } = await loadFixture(deployFixture);
      const plan = '{"actions":["daily walk","statin review"]}';
      await guardian.connect(agent).recordIntervention(8, 7700, hash(plan), hash("f"));

      expect(await guardian.verifyCarePlan(8, plan)).to.equal(true);
      expect(await guardian.verifyCarePlan(8, plan + " ")).to.equal(false);
    });

    it("reverts for a customer with no intervention", async function () {
      const { guardian } = await loadFixture(deployFixture);
      await expect(guardian.verifyCarePlan(404, "{}")).to.be.revertedWith("No intervention found");
    });
  });

  describe("getLatestIntervention", function () {
    it("reverts for a customer with no intervention", async function () {
      const { guardian } = await loadFixture(deployFixture);
      await expect(guardian.getLatestIntervention(404)).to.be.revertedWith(
        "No intervention recorded for this customer"
      );
    });
  });

  describe("setAgentAddress", function () {
    it("owner can rotate the agent; old agent loses access", async function () {
      const { guardian, owner, agent, stranger } = await loadFixture(deployFixture);
      await guardian.connect(owner).setAgentAddress(stranger.address);
      expect(await guardian.agentAddress()).to.equal(stranger.address);
      await expect(
        guardian.connect(agent).recordIntervention(1, 100, hash("p"), hash("f"))
      ).to.be.revertedWith("Unauthorized");
    });

    it("non-owner cannot rotate the agent", async function () {
      const { guardian, stranger } = await loadFixture(deployFixture);
      await expect(guardian.connect(stranger).setAgentAddress(stranger.address))
        .to.be.revertedWith("Only owner");
    });
  });
});
