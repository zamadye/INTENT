import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const EmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-12 border border-border/50 text-center"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>
      
      <h3 className="font-display text-xl font-semibold mb-2">
        No campaigns yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Create your first intent proof to start building your on-chain reputation on Arc Network.
      </p>
      
      <Button 
        variant="gradient" 
        size="lg"
        onClick={() => navigate('/create')}
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Your First Campaign
      </Button>
    </motion.div>
  );
};

export default EmptyState;
