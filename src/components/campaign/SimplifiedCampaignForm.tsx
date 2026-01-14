import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickStartSelector } from './QuickStartSelector';
import { SimplifiedImageStyle, mapToBackendStyle } from './SimplifiedImageStyle';
import { AdvancedOptions } from './AdvancedOptions';
import { QuickStartPreset, getDAppsForPreset } from '@/data/arcDapps';
import { CampaignData } from '@/pages/CreateCampaign';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SimplifiedCampaignFormProps {
  campaignData: CampaignData;
  setCampaignData: React.Dispatch<React.SetStateAction<CampaignData>>;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const SimplifiedCampaignForm: React.FC<SimplifiedCampaignFormProps> = ({
  campaignData,
  setCampaignData,
  onGenerate,
  isGenerating,
}) => {
  const [quickStartId, setQuickStartId] = useState('');
  const [simplifiedImageStyle, setSimplifiedImageStyle] = useState('vibrant');
  const [isVerifiedTwitter, setIsVerifiedTwitter] = useState(false);

  // Apply Quick Start preset
  const handleQuickStartChange = (preset: QuickStartPreset) => {
    setQuickStartId(preset.id);
    
    // Get actual dApp IDs from preset
    const dAppIds = preset.dAppIds.length > 0 ? preset.dAppIds : ['arcflow-finance'];
    
    setCampaignData(prev => ({
      ...prev,
      intentCategory: preset.category === 'DeFi' ? 'defi' 
        : preset.category === 'Bridge' ? 'defi'
        : preset.category === 'Yield' ? 'defi'
        : preset.category === 'Payment' ? 'infrastructure'
        : preset.category === 'Infrastructure' ? 'builder'
        : 'social',
      targetDApps: dAppIds,
      actionOrder: preset.suggestedActions,
      tones: [preset.defaultTone],
      // Auto-fill campaign type based on category
      campaignType: preset.category === 'DeFi' ? 'defi-promotion'
        : preset.category === 'Bridge' ? 'defi-promotion'
        : preset.category === 'Yield' ? 'defi-promotion'
        : preset.category === 'Payment' ? 'product-launch'
        : preset.category === 'Infrastructure' ? 'product-launch'
        : 'educational',
      // Always include all Arc context
      arcContext: ['usdc-gas', 'sub-second', 'arcflow', 'malachite', 'testnet'],
    }));
  };

  // Update image style - map to backend format
  const handleImageStyleChange = (style: string) => {
    setSimplifiedImageStyle(style);
    setCampaignData(prev => ({
      ...prev,
      imageStyle: mapToBackendStyle(style),
    }));
  };

  // Set default image style on mount
  useEffect(() => {
    if (!campaignData.imageStyle) {
      setCampaignData(prev => ({
        ...prev,
        imageStyle: 'cyberpunk', // Default to vibrant/web3
      }));
    }
  }, []);

  // Form is valid when Quick Start is selected and at least one dApp
  const isFormValid = quickStartId !== '' && quickStartId !== 'custom-selection' && campaignData.targetDApps.length >= 1;
  const isCustomMode = quickStartId === 'custom-selection';

  // Calculate caption limit based on Twitter account type
  const captionLimit = isVerifiedTwitter ? 280 : 200;

  return (
    <div className="glass rounded-2xl p-6 md:p-8 border border-border/50">
      <div className="space-y-8">
        {/* Step 1: Quick Start */}
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">1</span>
            Quick Start
          </h3>
          <p className="text-sm text-muted-foreground">
            Select your activity - we'll auto-fill the rest
          </p>
        </div>

        <QuickStartSelector
          value={quickStartId}
          onChange={handleQuickStartChange}
        />

        {/* Show what was auto-filled */}
        {quickStartId && !isCustomMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-accent/10 border border-accent/30"
          >
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <span>✓</span>
                <span>Category: {campaignData.campaignType?.replace('-', ' ')}</span>
              </div>
              <div className="flex items-center gap-2 text-accent">
                <span>✓</span>
                <span>dApps: {campaignData.targetDApps.length} selected</span>
              </div>
              <div className="flex items-center gap-2 text-accent">
                <span>✓</span>
                <span>Actions: {campaignData.actionOrder.length} steps</span>
              </div>
              <div className="flex items-center gap-2 text-accent">
                <span>✓</span>
                <span>Tone: {campaignData.tones.join(', ')}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Custom mode message */}
        {isCustomMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-secondary/30 border border-border/50"
          >
            <p className="text-sm text-muted-foreground">
              👇 Use Advanced Options below to select your dApps and configure your campaign
            </p>
          </motion.div>
        )}

        {/* Step 2: Visual Style + Twitter Type */}
        {quickStartId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">2</span>
                Style & Options
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </h3>
            </div>

            <SimplifiedImageStyle
              value={simplifiedImageStyle}
              onChange={handleImageStyleChange}
            />

            {/* Twitter Account Type Toggle */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="twitter-verified" className="flex items-center gap-2 text-sm font-medium">
                    <Twitter className="w-4 h-4" />
                    Twitter Account Type
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isVerifiedTwitter 
                      ? `Verified account: Up to ${captionLimit} characters`
                      : `Non-verified: Max ${captionLimit} characters`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs", !isVerifiedTwitter && "text-primary")}>Standard</span>
                  <Switch
                    id="twitter-verified"
                    checked={isVerifiedTwitter}
                    onCheckedChange={setIsVerifiedTwitter}
                  />
                  <span className={cn("text-xs flex items-center gap-1", isVerifiedTwitter && "text-primary")}>
                    Verified 
                    <span className="text-blue-400">✓</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Time Window - collapsed/optional */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Time Window:</span>
              <span className="text-foreground">{campaignData.timeWindow === 'none' ? 'No deadline' : campaignData.timeWindow}</span>
            </div>
          </motion.div>
        )}

        {/* Advanced Options (Collapsed by default) */}
        {quickStartId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <AdvancedOptions
              selectedDApps={campaignData.targetDApps}
              onDAppsChange={(dApps) => setCampaignData(prev => ({ ...prev, targetDApps: dApps }))}
              actionOrder={campaignData.actionOrder}
              onActionOrderChange={(actions) => setCampaignData(prev => ({ ...prev, actionOrder: actions }))}
              tones={campaignData.tones}
              onTonesChange={(tones) => setCampaignData(prev => ({ ...prev, tones }))}
              customInput={campaignData.customInput}
              onCustomInputChange={(input) => setCampaignData(prev => ({ ...prev, customInput: input }))}
              isCustomMode={isCustomMode}
            />
          </motion.div>
        )}

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="gradient"
            size="xl"
            className="w-full"
            onClick={onGenerate}
            disabled={(!isFormValid && !isCustomMode) || (isCustomMode && campaignData.targetDApps.length === 0) || isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Generating Campaign...
              </>
            ) : (
              <>
                Create Campaign
                <Zap className="w-5 h-5" />
              </>
            )}
          </Button>
          
          {!quickStartId && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Select what you're building to get started
            </p>
          )}
          
          {isFormValid && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Caption will be max {captionLimit} characters • @ArcFlowFinance will be included
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SimplifiedCampaignForm;
