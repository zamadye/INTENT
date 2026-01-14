import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickStartSelector } from './QuickStartSelector';
import { SimplifiedImageStyle, mapToBackendStyle } from './SimplifiedImageStyle';
import { AdvancedOptions } from './AdvancedOptions';
import { TimeWindowSelector, TimeWindow } from './TimeWindowSelector';
import { QuickStartPreset } from '@/shared/constants/dapps';
import { CampaignData } from '@/pages/CreateCampaign';

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

  // Apply Quick Start preset
  const handleQuickStartChange = (preset: QuickStartPreset) => {
    setQuickStartId(preset.id);
    setCampaignData(prev => ({
      ...prev,
      intentCategory: preset.intentCategory,
      targetDApps: preset.dApps,
      actionOrder: preset.suggestedActions,
      tones: [preset.defaultTone],
      // Auto-fill campaign type based on intent
      campaignType: preset.intentCategory === 'builder' ? 'product-launch' 
        : preset.intentCategory === 'defi' ? 'defi-promotion'
        : preset.intentCategory === 'social' ? 'community-event'
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

  // Form is valid when Quick Start is selected
  const isFormValid = quickStartId !== '' && campaignData.targetDApps.length >= 2;

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
        {quickStartId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-accent/10 border border-accent/30"
          >
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <span>✓</span>
                <span>Intent: {campaignData.intentCategory}</span>
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

        {/* Step 2: Visual Style (Optional but shown) */}
        {quickStartId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">2</span>
                Visual Style
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </h3>
            </div>

            <SimplifiedImageStyle
              value={simplifiedImageStyle}
              onChange={handleImageStyleChange}
            />

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
            disabled={!isFormValid || isGenerating}
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
        </motion.div>
      </div>
    </div>
  );
};

export default SimplifiedCampaignForm;
