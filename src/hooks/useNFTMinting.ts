import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  mintCampaignNFT, 
  generateNFTMetadata, 
  hashMetadata,
  MINT_COST_USDC 
} from '@/lib/nftContract';
import toast from 'react-hot-toast';

export interface MintingState {
  isMinting: boolean;
  mintStatus: string;
  mintProgress: number;
  tokenId: string | null;
  txHash: string | null;
  error: string | null;
}

export function useNFTMinting() {
  const [mintingState, setMintingState] = useState<MintingState>({
    isMinting: false,
    mintStatus: '',
    mintProgress: 0,
    tokenId: null,
    txHash: null,
    error: null,
  });

  const resetMinting = useCallback(() => {
    setMintingState({
      isMinting: false,
      mintStatus: '',
      mintProgress: 0,
      tokenId: null,
      txHash: null,
      error: null,
    });
  }, []);

  const mintNFT = useCallback(async (
    campaignId: string,
    caption: string,
    captionHash: string,
    imageUrl: string | null,
    campaignType: string,
    imageStyle: string,
    walletAddress: string
  ) => {
    setMintingState({
      isMinting: true,
      mintStatus: 'Initializing...',
      mintProgress: 10,
      tokenId: null,
      txHash: null,
      error: null,
    });

    try {
      // SECURITY: Verify user is authenticated (edge function handles the rest)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('Authentication required to mint NFT');
      }

      // Step 1: Generate metadata
      setMintingState(prev => ({ 
        ...prev, 
        mintStatus: 'Generating NFT metadata...', 
        mintProgress: 20 
      }));

      const metadata = generateNFTMetadata(
        campaignId,
        caption,
        captionHash,
        imageUrl,
        campaignType,
        imageStyle,
        walletAddress
      );

      const metadataHash = await hashMetadata(metadata);

      // Step 2: Mint on blockchain
      setMintingState(prev => ({ 
        ...prev, 
        mintStatus: 'Requesting wallet signature...', 
        mintProgress: 40 
      }));

      const mintResult = await mintCampaignNFT(
        metadata,
        (status) => {
          setMintingState(prev => ({ 
            ...prev, 
            mintStatus: status,
            mintProgress: prev.mintProgress + 10
          }));
        }
      );

      if (!mintResult.success) {
        throw new Error(mintResult.error || 'Minting failed');
      }

      // Step 3: Save NFT via edge function (server-side validation)
      setMintingState(prev => ({ 
        ...prev, 
        mintStatus: 'Recording on-chain activity...', 
        mintProgress: 80 
      }));

      // Use edge function instead of direct database operations
      const response = await supabase.functions.invoke('intent-proof-service/mint', {
        body: {
          campaignId,
          walletAddress: walletAddress.toLowerCase(),
          tokenId: mintResult.tokenId,
          txHash: mintResult.txHash,
          metadataHash,
          proofCost: MINT_COST_USDC,
        }
      });

      if (response.error) {
        console.error('Failed to save NFT to server:', response.error);
        // Don't fail the whole process, the mint was successful
      } else {
        console.log('✅ NFT recorded via edge function:', response.data?.nft?.id);
      }

      setMintingState({
        isMinting: false,
        mintStatus: 'NFT minted successfully!',
        mintProgress: 100,
        tokenId: mintResult.tokenId || null,
        txHash: mintResult.txHash || null,
        error: null,
      });

      toast.success('🎉 NFT minted successfully!', { duration: 5000 });

      return {
        success: true,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Minting failed';
      console.error('NFT minting error:', error);
      
      setMintingState({
        isMinting: false,
        mintStatus: '',
        mintProgress: 0,
        tokenId: null,
        txHash: null,
        error: errorMessage,
      });

      toast.error(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  return {
    ...mintingState,
    mintNFT,
    resetMinting,
    MINT_COST_USDC,
  };
}
