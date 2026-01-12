import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CampaignForm } from '@/components/campaign/CampaignForm';
import { CampaignPreview } from '@/components/campaign/CampaignPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface CampaignData {
  campaignType: string;
  tones: string[];
  arcContext: string[];
  customInput: string;
  imageStyle: string;
}

export interface GeneratedCampaign {
  id: string;
  caption: string;
  imageUrl: string | null;
  imageStatus: 'pending' | 'generating' | 'completed' | 'failed';
}

const CreateCampaign: React.FC = () => {
  const [campaignData, setCampaignData] = useState<CampaignData>({
    campaignType: '',
    tones: [],
    arcContext: [],
    customInput: '',
    imageStyle: '',
  });
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation for now
    setTimeout(() => {
      setGeneratedCampaign({
        id: `campaign-${Date.now()}`,
        caption: `🚀 Just discovered the power of Arc Network! With USDC gas fees and sub-second finality, this is what the future of blockchain looks like. The Malachite consensus is a game-changer. Ready to build on Arc Testnet? #ArcNetwork #Web3 #DeFi`,
        imageUrl: null,
        imageStatus: 'generating',
      });
      
      // Simulate image generation
      setTimeout(() => {
        setGeneratedCampaign(prev => prev ? {
          ...prev,
          imageUrl: 'https://picsum.photos/seed/arc-campaign/1200/675',
          imageStatus: 'completed',
        } : null);
        setIsGenerating(false);
      }, 2000);
    }, 1500);
  };

  const handleRegenerate = () => {
    setGeneratedCampaign(null);
    handleGenerate();
  };

  const updateCaption = (newCaption: string) => {
    if (generatedCampaign) {
      setGeneratedCampaign({ ...generatedCampaign, caption: newCaption });
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
              Create Your Campaign
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Design your AI-powered campaign for Arc Network. Choose your style, 
              generate content, and mint it as an NFT.
            </p>
          </motion.div>

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-3"
            >
              <CampaignForm
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
                <CampaignForm
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
