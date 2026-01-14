import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QUICK_START_PRESETS, QuickStartPreset } from '@/data/arcDapps';

interface QuickStartSelectorProps {
  value: string;
  onChange: (preset: QuickStartPreset) => void;
}

export const QuickStartSelector: React.FC<QuickStartSelectorProps> = ({
  value,
  onChange,
}) => {
  const handleChange = (presetId: string) => {
    const preset = QUICK_START_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onChange(preset);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">What are you building on Arc?</label>
        <span className="text-destructive">*</span>
      </div>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-full h-14 text-left">
          <SelectValue placeholder="Select your activity type..." />
        </SelectTrigger>
        <SelectContent>
          {QUICK_START_PRESETS.map((preset) => (
            <SelectItem 
              key={preset.id} 
              value={preset.id}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 py-1">
                <span className="text-xl">{preset.icon}</span>
                <div>
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">{preset.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {value && value !== 'custom-selection' && (
        <p className="text-xs text-muted-foreground">
          ✓ Intent category, target dApps, and suggested actions will be auto-filled
        </p>
      )}
    </div>
  );
};

export default QuickStartSelector;
