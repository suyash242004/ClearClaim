// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InsuranceClaim
 * @notice Immutable onchain audit trail for ClearClaim AI decisions.
 *         Every AI claim decision is recorded here — decision hash,
 *         outcome, confidence, timestamp — creating a publicly verifiable
 *         ledger of all autonomous adjudications.
 *
 * Deployed on: OKX X Layer Testnet (chainId: 1952)
 * RPC: https://testrpc.xlayer.tech
 * Explorer: https://explorer.xlayer.tech
 */
contract InsuranceClaim {
    address public owner;
    address public agentAddress; // The Python agent's wallet address

    // ── Structs ────────────────────────────────────────────────────────────
    struct ClaimRecord {
        uint256 claimId;
        string  decision;        // "Approve", "Reject", "Flag"
        bytes32 reasoningHash;   // keccak256(reasoning text) — saves gas vs storing full text
        uint8   confidencePercent; // 0-100
        address decidedBy;       // agent wallet address
        uint256 timestamp;
        bool    exists;
    }

    // ── Storage ────────────────────────────────────────────────────────────
    mapping(uint256 => ClaimRecord) public claimRecords;
    uint256[] public processedClaimIds;

    // ── Events ────────────────────────────────────────────────────────────
    event ClaimDecided(
        uint256 indexed claimId,
        string  decision,
        bytes32 reasoningHash,
        uint8   confidencePercent,
        address indexed decidedBy,
        uint256 timestamp
    );

    event AgentUpdated(address indexed oldAgent, address indexed newAgent);

    // ── Modifiers ─────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAgent() {
        require(
            msg.sender == agentAddress || msg.sender == owner,
            "Only authorized agent"
        );
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────
    constructor(address _agentAddress) {
        owner        = msg.sender;
        agentAddress = _agentAddress;
    }

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Records an AI claim decision onchain.
     * @param claimId           The database claim ID.
     * @param decision          "Approve", "Reject", or "Flag".
     * @param reasoningHash     keccak256 hash of the AI's full reasoning text.
     * @param confidencePercent AI confidence 0-100.
     */
    function recordDecision(
        uint256 claimId,
        string calldata decision,
        bytes32 reasoningHash,
        uint8   confidencePercent
    ) external onlyAgent {
        require(bytes(decision).length > 0, "Decision cannot be empty");
        require(confidencePercent <= 100, "Confidence must be 0-100");

        ClaimRecord memory record = ClaimRecord({
            claimId:           claimId,
            decision:          decision,
            reasoningHash:     reasoningHash,
            confidencePercent: confidencePercent,
            decidedBy:         msg.sender,
            timestamp:         block.timestamp,
            exists:            true
        });

        bool isNew = !claimRecords[claimId].exists;
        claimRecords[claimId] = record;

        // Track all processed claim IDs (skip duplicates)
        if (isNew) {
            processedClaimIds.push(claimId);
        }

        emit ClaimDecided(
            claimId,
            decision,
            reasoningHash,
            confidencePercent,
            msg.sender,
            block.timestamp
        );
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Returns the full on-chain record for a claim.
     */
    function getClaimRecord(uint256 claimId)
        external view
        returns (
            string memory decision,
            bytes32 reasoningHash,
            uint8   confidencePercent,
            address decidedBy,
            uint256 timestamp
        )
    {
        ClaimRecord storage r = claimRecords[claimId];
        require(r.exists, "Claim record not found");
        return (r.decision, r.reasoningHash, r.confidencePercent, r.decidedBy, r.timestamp);
    }

    /**
     * @notice Verifies a reasoning text against its onchain hash.
     * @param claimId   The claim to verify.
     * @param reasoning The original reasoning text to check.
     * @return verified True if the reasoning matches the stored hash.
     */
    function verifyReasoning(uint256 claimId, string calldata reasoning)
        external view
        returns (bool verified)
    {
        ClaimRecord storage r = claimRecords[claimId];
        require(r.exists, "Claim record not found");
        return r.reasoningHash == keccak256(bytes(reasoning));
    }

    /**
     * @notice Returns total number of decisions recorded.
     */
    function totalProcessed() external view returns (uint256) {
        return processedClaimIds.length;
    }

    // ── Admin Functions ────────────────────────────────────────────────────

    /**
     * @notice Update the authorized agent wallet address.
     */
    function setAgentAddress(address _newAgent) external onlyOwner {
        emit AgentUpdated(agentAddress, _newAgent);
        agentAddress = _newAgent;
    }
}
