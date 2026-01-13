// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CampaignRegistry
 * @notice Stores campaign metadata hashes and maps them to creators
 * @dev Minimal on-chain storage - detailed data is off-chain
 * 
 * Key Design Decisions:
 * - Only stores hashes, not full metadata
 * - Immutable once registered (campaigns cannot be modified)
 * - Simple mapping for lookup efficiency
 * - No economic or transfer logic
 */
contract CampaignRegistry {
    
    // ============ Structs ============
    
    struct CampaignRecord {
        address creator;
        uint256 registeredAt;
        bool exists;
    }
    
    // ============ State Variables ============
    
    /// @notice Platform backend authorized to register campaigns
    address public platformBackend;
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Total campaigns registered
    uint256 public totalCampaigns;
    
    /// @notice Mapping from campaign hash to record
    mapping(bytes32 => CampaignRecord) public campaigns;
    
    /// @notice Mapping from creator to their campaign hashes
    mapping(address => bytes32[]) public creatorCampaigns;
    
    // ============ Events ============
    
    event CampaignRegistered(
        bytes32 indexed campaignHash,
        address indexed creator,
        uint256 registeredAt
    );
    
    event PlatformBackendUpdated(
        address indexed previousBackend,
        address indexed newBackend
    );
    
    // ============ Errors ============
    
    error Unauthorized();
    error CampaignAlreadyExists();
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
     * @notice Initializes the registry with platform backend
     * @param _platformBackend Address authorized to register campaigns
     */
    constructor(address _platformBackend) {
        if (_platformBackend == address(0)) revert ZeroAddress();
        
        owner = msg.sender;
        platformBackend = _platformBackend;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Register a new campaign
     * @param campaignHash Unique hash of the campaign
     * @param creator Address of the campaign creator
     * 
     * @dev Only callable by platform backend
     * @dev Campaign hash must be unique
     */
    function registerCampaign(
        bytes32 campaignHash,
        address creator
    ) external onlyPlatformBackend {
        if (campaignHash == bytes32(0)) revert InvalidCampaignHash();
        if (creator == address(0)) revert ZeroAddress();
        if (campaigns[campaignHash].exists) revert CampaignAlreadyExists();
        
        campaigns[campaignHash] = CampaignRecord({
            creator: creator,
            registeredAt: block.timestamp,
            exists: true
        });
        
        creatorCampaigns[creator].push(campaignHash);
        totalCampaigns++;
        
        emit CampaignRegistered(campaignHash, creator, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get campaign creator by hash
     * @param campaignHash Hash to query
     * @return Creator address (zero if not found)
     */
    function getCampaignCreator(bytes32 campaignHash) external view returns (address) {
        return campaigns[campaignHash].creator;
    }
    
    /**
     * @notice Get campaign registration details
     * @param campaignHash Hash to query
     * @return creator Creator address
     * @return registeredAt Registration timestamp
     * @return exists Whether campaign exists
     */
    function getCampaignDetails(bytes32 campaignHash) external view returns (
        address creator,
        uint256 registeredAt,
        bool exists
    ) {
        CampaignRecord memory record = campaigns[campaignHash];
        return (record.creator, record.registeredAt, record.exists);
    }
    
    /**
     * @notice Check if a campaign exists
     * @param campaignHash Hash to check
     * @return Whether the campaign is registered
     */
    function campaignExists(bytes32 campaignHash) external view returns (bool) {
        return campaigns[campaignHash].exists;
    }
    
    /**
     * @notice Get all campaigns by creator
     * @param creator Address to query
     * @return Array of campaign hashes
     */
    function getCampaignsByCreator(address creator) external view returns (bytes32[] memory) {
        return creatorCampaigns[creator];
    }
    
    /**
     * @notice Get campaign count for a creator
     * @param creator Address to query
     * @return Number of campaigns
     */
    function getCreatorCampaignCount(address creator) external view returns (uint256) {
        return creatorCampaigns[creator].length;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update platform backend address
     * @param newBackend New backend address
     */
    function setPlatformBackend(address newBackend) external onlyOwner {
        if (newBackend == address(0)) revert ZeroAddress();
        
        address previousBackend = platformBackend;
        platformBackend = newBackend;
        
        emit PlatformBackendUpdated(previousBackend, newBackend);
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
