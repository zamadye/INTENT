// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIntentProof
 * @notice Interface for IntentProof contract
 */
interface IIntentProof {
    
    // ============ Structs ============
    
    struct Proof {
        address user;
        bytes32 campaignHash;
        uint256 timestamp;
        bool exists;
    }
    
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
    
    // ============ External Functions ============
    
    /**
     * @notice Record a new proof
     * @param user User address
     * @param campaignHash Campaign fingerprint hash
     * @return proofId New proof ID
     */
    function recordProof(
        address user,
        bytes32 campaignHash
    ) external returns (uint256 proofId);
    
    // ============ View Functions ============
    
    function getProofs(address user) external view returns (uint256[] memory);
    
    function getProofCount(address user) external view returns (uint256);
    
    function getProofDetails(uint256 proofId) external view returns (
        address user,
        bytes32 campaignHash,
        uint256 timestamp,
        bool exists
    );
    
    function userHasProofForCampaign(
        address user,
        bytes32 campaignHash
    ) external view returns (bool);
    
    function totalProofs() external view returns (uint256);
    
    function platformBackend() external view returns (address);
    
    function owner() external view returns (address);
}
