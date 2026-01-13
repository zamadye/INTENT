# INTENT Smart Contracts

Deploy-ready Solidity contracts for the INTENT platform on Arc Network.

## Contracts

### IntentProof.sol
Records structured participation proofs on-chain. NOT an NFT.

**Key Features:**
- One proof per user per campaign
- No transferability (proofs are bound to original participant)
- No economic logic (proofs have no monetary value)
- Minimal on-chain data
- Only platform backend can record proofs

**Struct:**
```solidity
struct Proof {
    address user;
    bytes32 campaignHash;
    uint256 timestamp;
    bool exists;
}
```

### CampaignRegistry.sol
Stores campaign metadata hashes and maps to creators.

**Key Features:**
- Only stores hashes (detailed metadata off-chain)
- Immutable once registered
- No economic or transfer logic
- Simple lookup by hash or creator

## Deployment

### Prerequisites
- Node.js >= 18
- Hardhat or Foundry
- Arc Testnet RPC access

### Environment Variables
```bash
DEPLOYER_PRIVATE_KEY=your_private_key
ARC_RPC_URL=https://rpc.testnet.arc.network
PLATFORM_BACKEND_ADDRESS=0x...
```

### Deploy with Hardhat
```bash
npx hardhat run scripts/deploy.js --network arcTestnet
```

### Deploy with Foundry
```bash
forge create --rpc-url $ARC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  src/IntentProof.sol:IntentProof \
  --constructor-args $PLATFORM_BACKEND_ADDRESS
```

## Network Configuration

### Arc Testnet
- Chain ID: 5042002 (0x4cef52)
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Native Gas: USDC

## Security Considerations

1. **Backend Authorization**: Only the designated platform backend can record proofs
2. **One Proof Per Campaign**: Users cannot claim duplicate proofs
3. **Immutability**: Recorded proofs cannot be modified or deleted
4. **No Economic Value**: Proofs are non-transferable records, not assets

## Gas Estimates (Arc Testnet with USDC gas)

| Function | Estimated Gas | ~Cost (USDC) |
|----------|---------------|--------------|
| recordProof | ~85,000 | ~0.01 |
| registerCampaign | ~65,000 | ~0.008 |

## Integration

### Recording a Proof (Backend)
```typescript
const tx = await intentProofContract.recordProof(
  userAddress,
  campaignHash // bytes32 fingerprint
);
await tx.wait();
```

### Checking Proof Ownership (Frontend)
```typescript
const proofIds = await intentProofContract.getProofs(userAddress);
const proofCount = proofIds.length;
// Use proofCount for access level calculation
```

## License

MIT
