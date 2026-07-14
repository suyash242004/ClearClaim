// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RiskOracle
 * @notice Records AI-generated predictive health risk scores onchain.
 *         The Predictive Risk Agent (Agent 5) calls this every time it
 *         scans a customer — creating a tamper-proof risk timeline.
 *
 * Deployed on: OKX X Layer Testnet (chainId: 1952)
 * Explorer:    https://explorer.xlayer.tech
 */
contract RiskOracle {
    address public owner;
    address public agentAddress;

    struct RiskRecord {
        uint256 customerId;
        uint256 riskScoreBps;    // risk_score * 10000 (e.g. 0.72 → 7200 bps) — avoids floats
        uint8   riskLevel;       // 0=Low, 1=Medium, 2=High
        bytes32 conditionsHash;  // keccak256 of predicted conditions JSON string
        uint256 timestamp;
        bool    guardianTriggered;
        bool    exists;
    }

    mapping(uint256 => RiskRecord[]) public riskHistory;  // customerId → history
    mapping(uint256 => RiskRecord)   public latestRisk;   // customerId → latest
    uint256[] public scannedCustomerIds;

    event RiskScored(
        uint256 indexed customerId,
        uint256 riskScoreBps,
        uint8   riskLevel,
        bool    guardianTriggered,
        uint256 timestamp
    );

    modifier onlyAgent() {
        require(msg.sender == agentAddress || msg.sender == owner, "Unauthorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _agentAddress) {
        owner        = msg.sender;
        agentAddress = _agentAddress;
    }

    /**
     * @notice Records a predictive risk score for a customer.
     * @param customerId        Database customer ID.
     * @param riskScoreBps      Risk score in basis points (0.72 → 7200).
     * @param riskLevel         0=Low, 1=Medium, 2=High.
     * @param conditionsHash    keccak256 of predicted conditions list.
     * @param guardianTriggered True if Health Guardian was auto-triggered.
     */
    function recordRiskScore(
        uint256 customerId,
        uint256 riskScoreBps,
        uint8   riskLevel,
        bytes32 conditionsHash,
        bool    guardianTriggered
    ) external onlyAgent {
        require(riskScoreBps <= 10000, "Risk score must be 0-10000 bps");
        require(riskLevel <= 2, "Risk level must be 0, 1, or 2");

        RiskRecord memory record = RiskRecord({
            customerId:        customerId,
            riskScoreBps:      riskScoreBps,
            riskLevel:         riskLevel,
            conditionsHash:    conditionsHash,
            timestamp:         block.timestamp,
            guardianTriggered: guardianTriggered,
            exists:            true
        });

        // Track new customers
        if (!latestRisk[customerId].exists) {
            scannedCustomerIds.push(customerId);
        }

        latestRisk[customerId] = record;
        riskHistory[customerId].push(record);

        emit RiskScored(customerId, riskScoreBps, riskLevel, guardianTriggered, block.timestamp);
    }

    function getLatestRisk(uint256 customerId)
        external view
        returns (uint256 riskScoreBps, uint8 riskLevel, bool guardianTriggered, uint256 timestamp)
    {
        RiskRecord storage r = latestRisk[customerId];
        require(r.exists, "No risk record for this customer");
        return (r.riskScoreBps, r.riskLevel, r.guardianTriggered, r.timestamp);
    }

    function getRiskHistoryLength(uint256 customerId) external view returns (uint256) {
        return riskHistory[customerId].length;
    }

    function totalCustomersScanned() external view returns (uint256) {
        return scannedCustomerIds.length;
    }

    function setAgentAddress(address _newAgent) external onlyOwner {
        agentAddress = _newAgent;
    }
}
