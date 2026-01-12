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

      // Step 3: Save NFT to database
      setMintingState(prev => ({ 
        ...prev, 
        mintStatus: 'Recording on-chain activity...', 
        mintProgress: 80 
      }));

      const { data: nftData, error: dbError } = await supabase
        .from('nfts')
        .insert({
          campaign_id: campaignId,
          wallet_address: walletAddress.toLowerCase(),
          token_id: mintResult.tokenId,
          tx_hash: mintResult.txHash,
          metadata_hash: metadataHash,
          mint_cost: MINT_COST_USDC,
          status: 'minted',
          minted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to save NFT to database:', dbError);
        // Don't fail the whole process, the mint was successful
      }

      // Step 4: Update campaign status
      await supabase
        .from('campaigns')
        .update({ status: 'minted' })
        .eq('id', campaignId);

      // Step 5: Update user profile stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('nfts_minted, campaigns_created')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ 
            nfts_minted: (profile.nfts_minted || 0) + 1,
            campaigns_created: (profile.campaigns_created || 0) + 1
          })
          .eq('wallet_address', walletAddress.toLowerCase());
      } else {
        // Create profile if doesn't exist
        await supabase
          .from('profiles')
          .insert({
            wallet_address: walletAddress.toLowerCase(),
            nfts_minted: 1,
            campaigns_created: 1
          });
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
