import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ARC_DAPPS, getDAppsByCategory } from '@/shared/constants/dapps';
import { cn } from '@/lib/utils';

interface AdvancedOptionsProps {
  selectedDApps: string[];
  onDAppsChange: (dApps: string[]) => void;
  actionOrder: string[];
  onActionOrderChange: (actions: string[]) => void;
  tones: string[];
  onTonesChange: (tones: string[]) => void;
  customInput: string;
  onCustomInputChange: (input: string) => void;
}

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'hype', label: 'Hype' },
  { value: 'educational', label: 'Educational' },
  { value: 'degen', label: 'Degen' },
  { value: 'technical', label: 'Technical' },
];

const dappCategories = [
  { id: 'defi', label: 'DeFi & Lending' },
  { id: 'yield', label: 'Yield & Assets' },
  { id: 'bridge', label: 'Cross-Chain' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'wallets', label: 'Wallets' },
] as const;

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  selectedDApps,
  onDAppsChange,
  actionOrder,
  onActionOrderChange,
  tones,
  onTonesChange,
  customInput,
  onCustomInputChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newAction, setNewAction] = useState('');

  const toggleDApp = (dAppId: string) => {
    if (selectedDApps.includes(dAppId)) {
      onDAppsChange(selectedDApps.filter(id => id !== dAppId));
    } else {
      onDAppsChange([...selectedDApps, dAppId]);
    }
  };

  const toggleTone = (tone: string) => {
    if (tones.includes(tone)) {
      onTonesChange(tones.filter(t => t !== tone));
    } else {
      onTonesChange([...tones, tone]);
    }
  };

  const addAction = () => {
    if (newAction.trim() && !actionOrder.includes(newAction.trim())) {
      onActionOrderChange([...actionOrder, newAction.trim()]);
      setNewAction('');
    }
  };

  const removeAction = (index: number) => {
    onActionOrderChange(actionOrder.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Settings2 className="w-4 h-4" />
          Advanced Options
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-6 border-t border-border/30">
              {/* Modify dApps */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Modify Target dApps</label>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {dappCategories.map(category => {
                    const categoryDApps = getDAppsByCategory(category.id as any);
                    if (categoryDApps.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {category.label}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {categoryDApps.map(dApp => (
                            <label
                              key={dApp.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm",
                                selectedDApps.includes(dApp.id)
                                  ? "bg-accent/10 border border-accent/30"
                                  : "bg-secondary/30 border border-transparent hover:bg-secondary/50"
                              )}
                            >
                              <Checkbox
                                checked={selectedDApps.includes(dApp.id)}
                                onCheckedChange={() => toggleDApp(dApp.id)}
                              />
                              <span>{dApp.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modify Actions */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Modify Action Order</label>
                <div className="space-y-2">
                  {actionOrder.map((action, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                      <span className="text-xs font-mono text-muted-foreground">{index + 1}.</span>
                      <span className="flex-1 text-sm">{action}</span>
                      <button
                        type="button"
                        onClick={() => removeAction(index)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      placeholder="Add custom action..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAction())}
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addAction}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tone Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Change Tone</label>
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => toggleTone(tone.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-all",
                        tones.includes(tone.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Custom Focus (optional)</label>
                  <span className="text-xs text-muted-foreground">{customInput.length}/280</span>
                </div>
                <Textarea
                  value={customInput}
                  onChange={(e) => onCustomInputChange(e.target.value.slice(0, 280))}
                  placeholder="Add your unique angle or specific message..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedOptions;
