// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HealthPassport
 * @notice Soulbound Token (SBT) representing a patient's on-chain health identity.
 *         Non-transferable to keep health identity linked to one wallet.
 */
contract HealthPassport {
    address public owner;
    address public agentAddress;

    struct Passport {
        uint256 customerId;        // Links to PostgreSQL customer_id
        uint256 mintedAt;          // When the passport was created
        uint256 totalClaims;       // Total claims filed
        uint256 approvedClaims;    // Total claims approved by AI
        uint256 latestRiskBps;     // Latest risk score in basis points (0-10000)
        uint8   latestRiskLevel;   // 0 = Low, 1 = Medium, 2 = High
        bool    guardianActive;    // True if Health Guardian preventive plan is active
        bool    exists;
    }

    mapping(address => Passport) public passports;
    mapping(uint256 => address)  public customerToWallet;
    address[] public wallets;

    event PassportMinted(address indexed wallet, uint256 indexed customerId, uint256 timestamp);
    event PassportUpdated(address indexed wallet, uint256 totalClaims, uint256 latestRiskBps);

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
     * @notice Mint a new soulbound passport for a patient.
     */
    function mintPassport(address wallet, uint256 customerId) external onlyAgent {
        require(!passports[wallet].exists, "Passport already exists for this wallet");
        
        passports[wallet] = Passport({
            customerId:      customerId,
            mintedAt:        block.timestamp,
            totalClaims:     0,
            approvedClaims:  0,
            latestRiskBps:   0,
            latestRiskLevel: 0,
            guardianActive:  false,
            exists:          true
        });

        customerToWallet[customerId] = wallet;
        wallets.push(wallet);

        emit PassportMinted(wallet, customerId, block.timestamp);
    }

    /**
     * @notice Record a claim decision on the patient's passport.
     */
    function recordClaimOnPassport(address wallet, bool approved) external onlyAgent {
        require(passports[wallet].exists, "Passport does not exist");
        passports[wallet].totalClaims += 1;
        if (approved) {
            passports[wallet].approvedClaims += 1;
        }
        emit PassportUpdated(wallet, passports[wallet].totalClaims, passports[wallet].latestRiskBps);
    }

    /**
     * @notice Update risk metrics on the patient's passport.
     */
    function updateRiskOnPassport(address wallet, uint256 riskBps, uint8 riskLevel) external onlyAgent {
        require(passports[wallet].exists, "Passport does not exist");
        require(riskBps <= 10000, "Risk score must be 0-10000 bps");
        require(riskLevel <= 2, "Risk level must be 0, 1, or 2");

        passports[wallet].latestRiskBps   = riskBps;
        passports[wallet].latestRiskLevel = riskLevel;

        emit PassportUpdated(wallet, passports[wallet].totalClaims, riskBps);
    }

    /**
     * @notice Update Health Guardian preventive plan status on the passport.
     */
    function updateGuardianOnPassport(address wallet, bool active) external onlyAgent {
        require(passports[wallet].exists, "Passport does not exist");
        passports[wallet].guardianActive = active;

        emit PassportUpdated(wallet, passports[wallet].totalClaims, passports[wallet].latestRiskBps);
    }

    /**
     * @notice Update the designated agent address.
     */
    function setAgentAddress(address _newAgent) external onlyOwner {
        agentAddress = _newAgent;
    }

    function totalPassports() external view returns (uint256) {
        return wallets.length;
    }

    // ── SBT — Block Transfers ───────────────────────────────────────────────
    function transferFrom(address, address, uint256) public pure {
        revert("Health Passport is non-transferable");
    }
}
