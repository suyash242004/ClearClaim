// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HealthGuardian
 * @notice Records autonomous Health Guardian interventions onchain.
 *         When Agent 6 generates a preventive care plan for a high-risk
 *         patient, this contract creates an immutable proof that the AI
 *         acted proactively — BEFORE any claim was filed.
 *
 * This is the most unique part of ClearClaim — proving that AI prevented
 * claims, not just processed them. Every intervention is timestamped and
 * publicly verifiable on X Layer.
 *
 * Deployed on: OKX X Layer Testnet (chainId: 1952)
 */
contract HealthGuardian {
    address public owner;
    address public agentAddress;

    struct Intervention {
        uint256 customerId;
        uint256 riskScoreBps;     // risk score that triggered intervention
        bytes32 carePlanHash;     // keccak256 of care plan JSON
        bytes32 riskFactorsHash;  // keccak256 of risk factors list
        uint256 timestamp;
        bool    exists;
    }

    mapping(uint256 => Intervention[]) public interventionHistory;
    mapping(uint256 => Intervention)   public latestIntervention;
    uint256[] public protectedCustomerIds;

    // Aggregate stats (autonomous agent performance metrics)
    uint256 public totalInterventions;
    uint256 public highRiskInterventions;    // riskScoreBps >= 7500

    event InterventionRecorded(
        uint256 indexed customerId,
        uint256 riskScoreBps,
        bytes32 carePlanHash,
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
     * @notice Records a Health Guardian proactive care intervention.
     * @param customerId      Database customer ID.
     * @param riskScoreBps    Risk score that triggered this intervention (basis points).
     * @param carePlanHash    keccak256 hash of the generated care plan JSON.
     * @param riskFactorsHash keccak256 hash of the identified risk factors.
     */
    function recordIntervention(
        uint256 customerId,
        uint256 riskScoreBps,
        bytes32 carePlanHash,
        bytes32 riskFactorsHash
    ) external onlyAgent {
        require(riskScoreBps <= 10000, "Invalid risk score");

        Intervention memory iv = Intervention({
            customerId:       customerId,
            riskScoreBps:     riskScoreBps,
            carePlanHash:     carePlanHash,
            riskFactorsHash:  riskFactorsHash,
            timestamp:        block.timestamp,
            exists:           true
        });

        if (!latestIntervention[customerId].exists) {
            protectedCustomerIds.push(customerId);
        }

        latestIntervention[customerId] = iv;
        interventionHistory[customerId].push(iv);

        totalInterventions++;
        if (riskScoreBps >= 7500) highRiskInterventions++;

        emit InterventionRecorded(customerId, riskScoreBps, carePlanHash, block.timestamp);
    }

    function getLatestIntervention(uint256 customerId)
        external view
        returns (uint256 riskScoreBps, bytes32 carePlanHash, uint256 timestamp)
    {
        Intervention storage iv = latestIntervention[customerId];
        require(iv.exists, "No intervention recorded for this customer");
        return (iv.riskScoreBps, iv.carePlanHash, iv.timestamp);
    }

    function verifyCarePlan(uint256 customerId, string calldata carePlanJson)
        external view
        returns (bool verified)
    {
        Intervention storage iv = latestIntervention[customerId];
        require(iv.exists, "No intervention found");
        return iv.carePlanHash == keccak256(bytes(carePlanJson));
    }

    function totalCustomersProtected() external view returns (uint256) {
        return protectedCustomerIds.length;
    }

    function setAgentAddress(address _newAgent) external onlyOwner {
        agentAddress = _newAgent;
    }
}
