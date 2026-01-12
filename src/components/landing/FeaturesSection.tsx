import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Link2, Gem } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI Generation',
    description: 'Powered by advanced AI models to create unique, engaging campaign content tailored for Arc Network.',
    gradient: 'from-primary to-cyan-glow',
  },
  {
    icon: Link2,
    title: 'On-Chain Proof',
    description: 'Every campaign is permanently recorded on Arc Network testnet, creating verifiable on-chain proof.',
    gradient: 'from-usdc to-usdc-glow',
  },
  {
    icon: Gem,
    title: 'NFT Minting',
    description: 'Mint your campaigns as unique NFTs. Each piece becomes a collectible on the Arc blockchain.',
    gradient: 'from-primary to-usdc',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Powerful Features
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create, mint, and share your campaigns on Arc Network.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="glass rounded-2xl p-8 h-full border border-border/50 transition-all duration-500 hover:border-primary/50 hover:translate-y-[-8px] hover:shadow-[0_20px_50px_hsl(189_100%_50%/0.15)]">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
