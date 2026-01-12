import React from 'react';
import { motion } from 'framer-motion';
import { PenLine, Sparkles, Coins, Share2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: PenLine,
    title: 'Create',
    description: 'Choose your campaign type, tone, and what Arc features to highlight.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Generate',
    description: 'AI creates unique caption and image based on your specifications.',
  },
  {
    number: '03',
    icon: Coins,
    title: 'Mint',
    description: 'Pay a small USDC fee to mint your campaign as an NFT on Arc.',
  },
  {
    number: '04',
    icon: Share2,
    title: 'Share',
    description: 'Share your on-chain campaign with the world and build your presence.',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From idea to on-chain proof in just four simple steps.
          </p>
        </motion.div>

        <div className="relative">
          {/* Desktop Timeline Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                {/* Mobile/Tablet connecting line */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden absolute left-8 top-20 w-0.5 h-full bg-gradient-to-b from-primary/50 to-transparent" />
                )}

                <div className="text-center lg:text-left">
                  {/* Step circle */}
                  <div className="relative inline-flex lg:mx-0">
                    <div className="w-16 h-16 rounded-full bg-cyber-gradient flex items-center justify-center shadow-lg shadow-primary/30 relative z-10">
                      <step.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    {/* Number badge */}
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="mt-6">
                    <h3 className="font-display text-xl font-semibold mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
