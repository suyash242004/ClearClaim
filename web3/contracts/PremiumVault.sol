// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PremiumVault
 * @notice Securely collects and logs insurance premium payments on-chain.
 *         When a customer pays for a policy, the payment is recorded here
 *         with their plan ID and customer ID.
 *
 * Deployed on: OKX X Layer Testnet (chainId: 1952)
 */
contract PremiumVault {
    address public owner;

    // Total premiums collected in wei
    uint256 public totalCollected;

    event PremiumPaid(
        address indexed payer,
        uint256 indexed planId,
        uint256 indexed customerId,
        uint256 amount,
        uint256 timestamp
    );

    event FundsWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Pay the premium for a selected plan.
     * @param planId The ID of the insurance plan.
     * @param customerId The database ID of the customer.
     */
    function payPremium(uint256 planId, uint256 customerId) external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");

        totalCollected += msg.value;

        emit PremiumPaid(
            msg.sender,
            planId,
            customerId,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @notice Withdraw collected premiums to the owner.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(owner, balance);
    }
}
