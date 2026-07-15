const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

/**
 * HealthPassport — soulbound on-chain health identity.
 * Tests run on the in-process Hardhat network only (never X Layer).
 */
describe("HealthPassport", function () {
  async function deployFixture() {
    const [owner, agent, patient, patient2, stranger] = await ethers.getSigners();
    const HealthPassport = await ethers.getContractFactory("HealthPassport");
    const passport = await HealthPassport.deploy(agent.address);
    return { passport, owner, agent, patient, patient2, stranger };
  }

  describe("Deployment", function () {
    it("sets owner and agent address", async function () {
      const { passport, owner, agent } = await loadFixture(deployFixture);
      expect(await passport.owner()).to.equal(owner.address);
      expect(await passport.agentAddress()).to.equal(agent.address);
    });

    it("starts with zero passports", async function () {
      const { passport } = await loadFixture(deployFixture);
      expect(await passport.totalPassports()).to.equal(0);
    });
  });

  describe("mintPassport", function () {
    it("mints a passport with zeroed stats and emits PassportMinted", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);

      await expect(passport.connect(agent).mintPassport(patient.address, 501))
        .to.emit(passport, "PassportMinted")
        .withArgs(patient.address, 501, anyValue);

      const p = await passport.passports(patient.address);
      expect(p.customerId).to.equal(501);
      expect(p.exists).to.equal(true);
      expect(p.totalClaims).to.equal(0);
      expect(p.approvedClaims).to.equal(0);
      expect(p.latestRiskBps).to.equal(0);
      expect(p.latestRiskLevel).to.equal(0);
      expect(p.guardianActive).to.equal(false);
      expect(p.mintedAt).to.be.gt(0);

      expect(await passport.customerToWallet(501)).to.equal(patient.address);
      expect(await passport.totalPassports()).to.equal(1);
      expect(await passport.wallets(0)).to.equal(patient.address);
    });

    it("reverts when minting twice for the same wallet", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);
      await expect(
        passport.connect(agent).mintPassport(patient.address, 502)
      ).to.be.revertedWith("Passport already exists for this wallet");
      expect(await passport.totalPassports()).to.equal(1);
    });

    it("KNOWN BEHAVIOR: the same customerId can be minted to a second wallet, remapping customerToWallet", async function () {
      // The contract only guards per-wallet uniqueness, not per-customerId.
      // Minting customerId 501 to a second wallet silently repoints
      // customerToWallet[501] to the new wallet while the first wallet's
      // passport still claims customerId 501. Documented as current behavior.
      const { passport, agent, patient, patient2 } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);
      await passport.connect(agent).mintPassport(patient2.address, 501);

      expect(await passport.customerToWallet(501)).to.equal(patient2.address);
      expect((await passport.passports(patient.address)).customerId).to.equal(501);
      expect(await passport.totalPassports()).to.equal(2);
    });

    it("reverts for unauthorized callers", async function () {
      const { passport, stranger, patient } = await loadFixture(deployFixture);
      await expect(
        passport.connect(stranger).mintPassport(patient.address, 501)
      ).to.be.revertedWith("Unauthorized");
    });

    it("allows the owner to mint as well (owner passes onlyAgent)", async function () {
      const { passport, owner, patient } = await loadFixture(deployFixture);
      await passport.connect(owner).mintPassport(patient.address, 900);
      expect(await passport.totalPassports()).to.equal(1);
    });
  });

  describe("recordClaimOnPassport", function () {
    it("increments claim counters and emits PassportUpdated", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);

      await expect(passport.connect(agent).recordClaimOnPassport(patient.address, true))
        .to.emit(passport, "PassportUpdated")
        .withArgs(patient.address, 1, 0);

      await passport.connect(agent).recordClaimOnPassport(patient.address, false);

      const p = await passport.passports(patient.address);
      expect(p.totalClaims).to.equal(2);
      expect(p.approvedClaims).to.equal(1); // only the approved one counted
    });

    it("reverts when the passport does not exist", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await expect(
        passport.connect(agent).recordClaimOnPassport(patient.address, true)
      ).to.be.revertedWith("Passport does not exist");
    });

    it("reverts for unauthorized callers", async function () {
      const { passport, agent, patient, stranger } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);
      await expect(
        passport.connect(stranger).recordClaimOnPassport(patient.address, true)
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("updateRiskOnPassport", function () {
    it("updates risk fields and emits PassportUpdated", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);

      await expect(passport.connect(agent).updateRiskOnPassport(patient.address, 7200, 2))
        .to.emit(passport, "PassportUpdated")
        .withArgs(patient.address, 0, 7200);

      const p = await passport.passports(patient.address);
      expect(p.latestRiskBps).to.equal(7200);
      expect(p.latestRiskLevel).to.equal(2);
    });

    it("reverts on out-of-range risk score or level", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);
      await expect(
        passport.connect(agent).updateRiskOnPassport(patient.address, 10001, 1)
      ).to.be.revertedWith("Risk score must be 0-10000 bps");
      await expect(
        passport.connect(agent).updateRiskOnPassport(patient.address, 5000, 3)
      ).to.be.revertedWith("Risk level must be 0, 1, or 2");
    });

    it("reverts when the passport does not exist", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await expect(
        passport.connect(agent).updateRiskOnPassport(patient.address, 5000, 1)
      ).to.be.revertedWith("Passport does not exist");
    });

    it("reverts for unauthorized callers", async function () {
      const { passport, agent, patient, stranger } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);
      await expect(
        passport.connect(stranger).updateRiskOnPassport(patient.address, 5000, 1)
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("updateGuardianOnPassport", function () {
    it("toggles guardianActive and emits PassportUpdated", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);

      await expect(passport.connect(agent).updateGuardianOnPassport(patient.address, true))
        .to.emit(passport, "PassportUpdated")
        .withArgs(patient.address, 0, 0);
      expect((await passport.passports(patient.address)).guardianActive).to.equal(true);

      await passport.connect(agent).updateGuardianOnPassport(patient.address, false);
      expect((await passport.passports(patient.address)).guardianActive).to.equal(false);
    });

    it("reverts when the passport does not exist", async function () {
      const { passport, agent, patient } = await loadFixture(deployFixture);
      await expect(
        passport.connect(agent).updateGuardianOnPassport(patient.address, true)
      ).to.be.revertedWith("Passport does not exist");
    });

    it("reverts for unauthorized callers", async function () {
      const { passport, agent, patient, stranger } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);
      await expect(
        passport.connect(stranger).updateGuardianOnPassport(patient.address, true)
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Soulbound behavior", function () {
    it("transferFrom always reverts — passport is non-transferable", async function () {
      const { passport, agent, patient, patient2 } = await loadFixture(deployFixture);
      await passport.connect(agent).mintPassport(patient.address, 501);
      await expect(
        passport.connect(patient).transferFrom(patient.address, patient2.address, 501)
      ).to.be.revertedWith("Health Passport is non-transferable");
      // even the owner/agent cannot transfer
      await expect(
        passport.connect(agent).transferFrom(patient.address, patient2.address, 501)
      ).to.be.revertedWith("Health Passport is non-transferable");
    });
  });

  describe("setAgentAddress", function () {
    it("owner can rotate the agent; old agent loses access", async function () {
      const { passport, owner, agent, patient, stranger } = await loadFixture(deployFixture);
      await passport.connect(owner).setAgentAddress(stranger.address);
      expect(await passport.agentAddress()).to.equal(stranger.address);
      await expect(
        passport.connect(agent).mintPassport(patient.address, 1)
      ).to.be.revertedWith("Unauthorized");
      await passport.connect(stranger).mintPassport(patient.address, 1);
    });

    it("non-owner cannot rotate the agent", async function () {
      const { passport, stranger } = await loadFixture(deployFixture);
      await expect(passport.connect(stranger).setAgentAddress(stranger.address))
        .to.be.revertedWith("Only owner");
    });
  });
});
