const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

/**
 * InsuranceClaim — immutable audit trail of AI claim decisions.
 * Tests run on the in-process Hardhat network only (never X Layer).
 */
describe("InsuranceClaim", function () {
  async function deployFixture() {
    const [owner, agent, stranger] = await ethers.getSigners();
    const InsuranceClaim = await ethers.getContractFactory("InsuranceClaim");
    const claim = await InsuranceClaim.deploy(agent.address);
    return { claim, owner, agent, stranger };
  }

  const hash = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));

  describe("Deployment", function () {
    it("sets owner and agent address", async function () {
      const { claim, owner, agent } = await loadFixture(deployFixture);
      expect(await claim.owner()).to.equal(owner.address);
      expect(await claim.agentAddress()).to.equal(agent.address);
    });

    it("starts with zero processed claims", async function () {
      const { claim } = await loadFixture(deployFixture);
      expect(await claim.totalProcessed()).to.equal(0);
    });
  });

  describe("recordDecision", function () {
    it("records a decision and emits ClaimDecided", async function () {
      const { claim, agent } = await loadFixture(deployFixture);
      const reasoningHash = hash("Bills consistent with diagnosis; within policy limits.");

      await expect(claim.connect(agent).recordDecision(101, "Approve", reasoningHash, 92))
        .to.emit(claim, "ClaimDecided")
        .withArgs(101, "Approve", reasoningHash, 92, agent.address, anyValue);

      const rec = await claim.getClaimRecord(101);
      expect(rec.decision).to.equal("Approve");
      expect(rec.reasoningHash).to.equal(reasoningHash);
      expect(rec.confidencePercent).to.equal(92);
      expect(rec.decidedBy).to.equal(agent.address);
      expect(rec.timestamp).to.be.gt(0);
      expect(await claim.totalProcessed()).to.equal(1);
    });

    it("allows the owner to record as well (owner passes onlyAgent)", async function () {
      const { claim, owner } = await loadFixture(deployFixture);
      await claim.connect(owner).recordDecision(7, "Flag", hash("manual review"), 55);
      const rec = await claim.getClaimRecord(7);
      expect(rec.decidedBy).to.equal(owner.address);
    });

    it("tracks distinct claim IDs in processedClaimIds", async function () {
      const { claim, agent } = await loadFixture(deployFixture);
      await claim.connect(agent).recordDecision(1, "Approve", hash("a"), 90);
      await claim.connect(agent).recordDecision(2, "Reject", hash("b"), 88);
      expect(await claim.totalProcessed()).to.equal(2);
      expect(await claim.processedClaimIds(0)).to.equal(1);
      expect(await claim.processedClaimIds(1)).to.equal(2);
    });

    it("overwrites an existing decision without inflating totalProcessed", async function () {
      // NOTE: the contract permits overwriting a prior decision for the same
      // claimId (audit trail of the OLD record survives only in event logs).
      const { claim, agent } = await loadFixture(deployFixture);
      await claim.connect(agent).recordDecision(42, "Approve", hash("v1"), 80);
      await claim.connect(agent).recordDecision(42, "Reject", hash("v2"), 99);

      expect(await claim.totalProcessed()).to.equal(1); // de-duplicated
      const rec = await claim.getClaimRecord(42);
      expect(rec.decision).to.equal("Reject");
      expect(rec.reasoningHash).to.equal(hash("v2"));
      expect(rec.confidencePercent).to.equal(99);
    });

    it("reverts on empty decision string", async function () {
      const { claim, agent } = await loadFixture(deployFixture);
      await expect(
        claim.connect(agent).recordDecision(1, "", hash("x"), 50)
      ).to.be.revertedWith("Decision cannot be empty");
    });

    it("reverts when confidence > 100", async function () {
      const { claim, agent } = await loadFixture(deployFixture);
      await expect(
        claim.connect(agent).recordDecision(1, "Approve", hash("x"), 101)
      ).to.be.revertedWith("Confidence must be 0-100");
    });

    it("reverts for unauthorized callers", async function () {
      const { claim, stranger } = await loadFixture(deployFixture);
      await expect(
        claim.connect(stranger).recordDecision(1, "Approve", hash("x"), 50)
      ).to.be.revertedWith("Only authorized agent");
    });
  });

  describe("verifyReasoning", function () {
    it("returns true for the original reasoning text", async function () {
      const { claim, agent } = await loadFixture(deployFixture);
      const reasoning = "Approved: documents verified, amount within sum insured.";
      await claim.connect(agent).recordDecision(5, "Approve", hash(reasoning), 95);
      expect(await claim.verifyReasoning(5, reasoning)).to.equal(true);
    });

    it("returns false for tampered reasoning text", async function () {
      const { claim, agent } = await loadFixture(deployFixture);
      await claim.connect(agent).recordDecision(5, "Approve", hash("original"), 95);
      expect(await claim.verifyReasoning(5, "tampered")).to.equal(false);
    });

    it("reverts for an unknown claim", async function () {
      const { claim } = await loadFixture(deployFixture);
      await expect(claim.verifyReasoning(999, "x")).to.be.revertedWith("Claim record not found");
    });
  });

  describe("getClaimRecord", function () {
    it("reverts for an unknown claim", async function () {
      const { claim } = await loadFixture(deployFixture);
      await expect(claim.getClaimRecord(404)).to.be.revertedWith("Claim record not found");
    });
  });

  describe("setAgentAddress", function () {
    it("owner can rotate the agent and it emits AgentUpdated", async function () {
      const { claim, owner, agent, stranger } = await loadFixture(deployFixture);
      await expect(claim.connect(owner).setAgentAddress(stranger.address))
        .to.emit(claim, "AgentUpdated")
        .withArgs(agent.address, stranger.address);
      expect(await claim.agentAddress()).to.equal(stranger.address);

      // new agent can write, old agent cannot
      await claim.connect(stranger).recordDecision(1, "Approve", hash("ok"), 70);
      await expect(
        claim.connect(agent).recordDecision(2, "Approve", hash("no"), 70)
      ).to.be.revertedWith("Only authorized agent");
    });

    it("non-owner (including the agent) cannot rotate the agent", async function () {
      const { claim, agent, stranger } = await loadFixture(deployFixture);
      await expect(claim.connect(stranger).setAgentAddress(stranger.address))
        .to.be.revertedWith("Only owner");
      await expect(claim.connect(agent).setAgentAddress(agent.address))
        .to.be.revertedWith("Only owner");
    });
  });
});
