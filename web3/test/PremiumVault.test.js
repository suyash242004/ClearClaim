const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

/**
 * PremiumVault — on-chain premium collection and logging.
 * Tests run on the in-process Hardhat network only (never X Layer).
 */
describe("PremiumVault", function () {
  async function deployFixture() {
    const [owner, customer, customer2, stranger] = await ethers.getSigners();
    const PremiumVault = await ethers.getContractFactory("PremiumVault");
    const vault = await PremiumVault.deploy();
    return { vault, owner, customer, customer2, stranger };
  }

  describe("Deployment", function () {
    it("sets owner and starts with zero collected", async function () {
      const { vault, owner } = await loadFixture(deployFixture);
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.totalCollected()).to.equal(0);
      expect(await ethers.provider.getBalance(vault.target)).to.equal(0);
    });
  });

  describe("payPremium", function () {
    it("accepts payment, emits PremiumPaid, and updates totalCollected + balance", async function () {
      const { vault, customer } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.05");

      await expect(vault.connect(customer).payPremium(3, 501, { value: amount }))
        .to.emit(vault, "PremiumPaid")
        .withArgs(customer.address, 3, 501, amount, anyValue);

      expect(await vault.totalCollected()).to.equal(amount);
      expect(await ethers.provider.getBalance(vault.target)).to.equal(amount);
    });

    it("accumulates totalCollected across multiple payers", async function () {
      const { vault, customer, customer2 } = await loadFixture(deployFixture);
      const a1 = ethers.parseEther("0.05");
      const a2 = ethers.parseEther("0.2");
      await vault.connect(customer).payPremium(1, 501, { value: a1 });
      await vault.connect(customer2).payPremium(2, 502, { value: a2 });
      expect(await vault.totalCollected()).to.equal(a1 + a2);
      expect(await ethers.provider.getBalance(vault.target)).to.equal(a1 + a2);
    });

    it("reverts on zero-value payment", async function () {
      const { vault, customer } = await loadFixture(deployFixture);
      await expect(
        vault.connect(customer).payPremium(1, 501, { value: 0 })
      ).to.be.revertedWith("Payment amount must be greater than 0");
    });
  });

  describe("Direct transfers", function () {
    it("rejects plain OKB/ETH transfers — no receive/fallback function", async function () {
      // The vault only accepts funds through payPremium(); a bare transfer
      // to the contract address reverts. Note: funds forced in via
      // selfdestruct/coinbase would still bypass this (standard EVM caveat)
      // and would NOT be reflected in totalCollected.
      const { vault, customer } = await loadFixture(deployFixture);
      await expect(
        customer.sendTransaction({ to: vault.target, value: ethers.parseEther("1") })
      ).to.be.reverted;
      expect(await ethers.provider.getBalance(vault.target)).to.equal(0);
    });
  });

  describe("withdraw", function () {
    it("owner withdraws full balance and FundsWithdrawn is emitted", async function () {
      const { vault, owner, customer } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.3");
      await vault.connect(customer).payPremium(1, 501, { value: amount });

      await expect(vault.connect(owner).withdraw())
        .to.emit(vault, "FundsWithdrawn")
        .withArgs(owner.address, amount);

      expect(await ethers.provider.getBalance(vault.target)).to.equal(0);
      // totalCollected is a lifetime counter — it is NOT reduced by withdrawal
      expect(await vault.totalCollected()).to.equal(amount);
    });

    it("moves the funds to the owner's wallet", async function () {
      const { vault, owner, customer } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("0.3");
      await vault.connect(customer).payPremium(1, 501, { value: amount });
      await expect(vault.connect(owner).withdraw()).to.changeEtherBalances(
        [vault, owner],
        [-amount, amount]
      );
    });

    it("reverts when there is nothing to withdraw", async function () {
      const { vault, owner } = await loadFixture(deployFixture);
      await expect(vault.connect(owner).withdraw()).to.be.revertedWith("No funds to withdraw");
    });

    it("reverts for non-owner callers", async function () {
      const { vault, customer, stranger } = await loadFixture(deployFixture);
      await vault.connect(customer).payPremium(1, 501, { value: ethers.parseEther("0.1") });
      await expect(vault.connect(stranger).withdraw()).to.be.revertedWith("Only owner");
    });
  });
});
