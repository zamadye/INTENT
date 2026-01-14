import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Wallet } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SimplifiedCampaignForm } from '@/components/campaign/SimplifiedCampaignForm';
import { CampaignPreview } from '@/components/campaign/CampaignPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCampaignGeneration } from '@/hooks/useCampaignGeneration';
import { useWallet } from '@/contexts/WalletContext';
import { useAccessLevel } from '@/contexts/AccessLevelContext';
import { IntentCategory } from '@/components/campaign/IntentCategorySelector';
import { TimeWindow } from '@/components/campaign/TimeWindowSelector';

export interface CampaignData {
  campaignType: string;
  tones: string[];
  arcContext: string[];
  customInput: string;
  imageStyle: string;
  intentCategory: IntentCategory | '';
  targetDApps: string[];
  actionOrder: string[];
  timeWindow: TimeWindow;
}

export type { GeneratedCampaign } from '@/hooks/useCampaignGeneration';

const CreateCampaign: React.FC = () => {
  const { isConnected, address, connect, isConnecting, isCorrectNetwork, switchNetwork } = useWallet();
  const { accessLevel, refreshAccessLevel } = useAccessLevel();
  const {
    isGenerating,
    generatedCampaign,
    error,
    generateCampaign,
    regenerateCampaign,
    updateCaption,
    completeCampaign,
    isCompleting
  } = useCampaignGeneration();

  const [campaignData, setCampaignData] = useState<CampaignData>({
    campaignType: '',
    tones: [],
    arcContext: [],
    customInput: '',
    imageStyle: '',
    // New INTENT fields
    intentCategory: '',
    targetDApps: [],
    actionOrder: [],
    timeWindow: 'none',
  });
  const [activeTab, setActiveTab] = useState('create');
  const [completedCampaignId, setCompletedCampaignId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }
    await generateCampaign(campaignData, address);
  };

  const handleRegenerate = async () => {
    await regenerateCampaign(campaignData, address);
  };

  const handleComplete = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }
    if (!address || !generatedCampaign) return;

    const result = await completeCampaign(campaignData, address);
    if (result?.id) {
      setCompletedCampaignId(result.id);
      // Refresh access level after completing a campaign
      refreshAccessLevel();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Create Your Intent
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Design your structured intent campaign for Arc Network. Define your actions, 
              generate content, and lock your intent as on-chain proof.
            </p>
            {accessLevel && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30">
                <span className="text-xs text-accent capitalize">Access: {String(accessLevel)}</span>
              </div>
            )}
          </motion.div>

          {/* Wallet Connection Alert */}
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Alert className="border-primary/50 bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Connect your wallet to create campaigns on Arc Network.</span>
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={connect}
                    disabled={isConnecting}
                    className="ml-4"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Network Warning */}
          {isConnected && !isCorrectNetwork && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Please switch to Arc Testnet to continue.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={switchNetwork}
                    className="ml-4"
                  >
                    Switch Network
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-3"
            >
              <SimplifiedCampaignForm
                campaignData={campaignData}
                setCampaignData={setCampaignData}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <div className="sticky top-28">
                <CampaignPreview
                  campaign={generatedCampaign}
                  isGenerating={isGenerating}
                  onRegenerate={handleRegenerate}
                  onUpdateCaption={updateCaption}
                  campaignData={campaignData}
                  onComplete={handleComplete}
                  isCompleting={isCompleting}
                  completedCampaignId={completedCampaignId}
                />
              </div>
            </motion.div>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="lg:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create">Create</TabsTrigger>
                <TabsTrigger value="preview">
                  Preview
                  {generatedCampaign && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="create">
                <SimplifiedCampaignForm
                  campaignData={campaignData}
                  setCampaignData={setCampaignData}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              </TabsContent>
              
              <TabsContent value="preview">
                <CampaignPreview
                  campaign={generatedCampaign}
                  isGenerating={isGenerating}
                  onRegenerate={handleRegenerate}
                  onUpdateCaption={updateCaption}
                  campaignData={campaignData}
                  onComplete={handleComplete}
                  isCompleting={isCompleting}
                  completedCampaignId={completedCampaignId}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateCampaign;
