// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICampaignRegistry
 * @notice Interface for CampaignRegistry contract
 */
interface ICampaignRegistry {
    
    // ============ Structs ============
    
    struct CampaignRecord {
        address creator;
        uint256 registeredAt;
        bool exists;
    }
    
    // ============ Events ============
    
    event CampaignRegistered(
        bytes32 indexed campaignHash,
        address indexed creator,
        uint256 registeredAt
    );
    
    // ============ External Functions ============
    
    /**
     * @notice Register a campaign
     * @param campaignHash Unique campaign hash
     * @param creator Creator address
     */
    function registerCampaign(
        bytes32 campaignHash,
        address creator
    ) external;
    
    // ============ View Functions ============
    
    function getCampaignCreator(bytes32 campaignHash) external view returns (address);
    
    function getCampaignDetails(bytes32 campaignHash) external view returns (
        address creator,
        uint256 registeredAt,
        bool exists
    );
    
    function campaignExists(bytes32 campaignHash) external view returns (bool);
    
    function getCampaignsByCreator(address creator) external view returns (bytes32[] memory);
    
    function getCreatorCampaignCount(address creator) external view returns (uint256);
    
    function totalCampaigns() external view returns (uint256);
}
