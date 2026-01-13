// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IntentProof
 * @notice Records structured participation proofs on Arc Network
 * @dev NOT an NFT - purely a proof/record system
 * 
 * Key Design Decisions:
 * - No transferability (proofs are bound to the original participant)
 * - No economic logic (proofs have no monetary value)
 * - Minimal on-chain data (detailed metadata stored off-chain)
 * - One proof per user per campaign hash
 */
contract IntentProof {
    
    // ============ Structs ============
    
    struct Proof {
        address user;
        bytes32 campaignHash;
        uint256 timestamp;
        bool exists;
    }
    
    // ============ State Variables ============
    
    /// @notice Platform backend address authorized to record proofs
    address public platformBackend;
    
    /// @notice Contract owner for administrative functions
    address public owner;
    
    /// @notice Total number of proofs recorded
    uint256 public totalProofs;
    
    /// @notice Mapping from proof ID to Proof struct
    mapping(uint256 => Proof) public proofs;
    
    /// @notice Mapping from user address to their proof IDs
    mapping(address => uint256[]) public userProofs;
    
    /// @notice Mapping to prevent duplicate proofs (user + campaignHash)
    mapping(address => mapping(bytes32 => bool)) public hasProof;
    
    // ============ Events ============
    
    event ProofRecorded(
        uint256 indexed proofId,
        address indexed user,
        bytes32 indexed campaignHash,
        uint256 timestamp
    );
    
    event PlatformBackendUpdated(
        address indexed previousBackend,
        address indexed newBackend
    );
    
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    
    // ============ Errors ============
    
    error Unauthorized();
    error ProofAlreadyExists();
    error ZeroAddress();
    error InvalidCampaignHash();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyPlatformBackend() {
        if (msg.sender != platformBackend) revert Unauthorized();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Initializes the contract with platform backend address
     * @param _platformBackend Address authorized to record proofs
     */
    constructor(address _platformBackend) {
        if (_platformBackend == address(0)) revert ZeroAddress();
        
        owner = msg.sender;
        platformBackend = _platformBackend;
        
        emit OwnershipTransferred(address(0), msg.sender);
        emit PlatformBackendUpdated(address(0), _platformBackend);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Records a new proof of structured intent
     * @param user Address of the user who completed the campaign
     * @param campaignHash Unique hash of the campaign (fingerprint)
     * @return proofId The ID of the newly created proof
     * 
     * @dev Only callable by platform backend
     * @dev Reverts if proof already exists for this user + campaign
     */
    function recordProof(
        address user,
        bytes32 campaignHash
    ) external onlyPlatformBackend returns (uint256 proofId) {
        if (user == address(0)) revert ZeroAddress();
        if (campaignHash == bytes32(0)) revert InvalidCampaignHash();
        if (hasProof[user][campaignHash]) revert ProofAlreadyExists();
        
        proofId = totalProofs++;
        
        proofs[proofId] = Proof({
            user: user,
            campaignHash: campaignHash,
            timestamp: block.timestamp,
            exists: true
        });
        
        userProofs[user].push(proofId);
        hasProof[user][campaignHash] = true;
        
        emit ProofRecorded(proofId, user, campaignHash, block.timestamp);
        
        return proofId;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all proof IDs for a specific user
     * @param user Address to query
     * @return Array of proof IDs
     */
    function getProofs(address user) external view returns (uint256[] memory) {
        return userProofs[user];
    }
    
    /**
     * @notice Get the count of proofs for a user
     * @param user Address to query
     * @return Number of proofs
     */
    function getProofCount(address user) external view returns (uint256) {
        return userProofs[user].length;
    }
    
    /**
     * @notice Get detailed proof information
     * @param proofId ID of the proof to query
     * @return user Address of proof owner
     * @return campaignHash Campaign fingerprint
     * @return timestamp When the proof was recorded
     * @return exists Whether the proof exists
     */
    function getProofDetails(uint256 proofId) external view returns (
        address user,
        bytes32 campaignHash,
        uint256 timestamp,
        bool exists
    ) {
        Proof memory proof = proofs[proofId];
        return (proof.user, proof.campaignHash, proof.timestamp, proof.exists);
    }
    
    /**
     * @notice Check if a user has a proof for a specific campaign
     * @param user Address to check
     * @param campaignHash Campaign hash to check
     * @return Whether the proof exists
     */
    function userHasProofForCampaign(
        address user,
        bytes32 campaignHash
    ) external view returns (bool) {
        return hasProof[user][campaignHash];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update the platform backend address
     * @param newBackend New backend address
     * 
     * @dev Only callable by owner
     */
    function setPlatformBackend(address newBackend) external onlyOwner {
        if (newBackend == address(0)) revert ZeroAddress();
        
        address previousBackend = platformBackend;
        platformBackend = newBackend;
        
        emit PlatformBackendUpdated(previousBackend, newBackend);
    }
    
    /**
     * @notice Transfer contract ownership
     * @param newOwner New owner address
     * 
     * @dev Only callable by current owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
