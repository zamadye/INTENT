import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Target, Users, Activity } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  delay: number;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, suffix, label, delay }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
      className="glass rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(189_100%_50%/0.15)]"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-cyber-gradient flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="font-display text-3xl font-bold">
            {count.toLocaleString()}
            <span className="text-primary">{suffix}</span>
          </div>
          <p className="text-muted-foreground text-sm">{label}</p>
        </div>
      </div>
    </motion.div>
  );
};

export const StatsSection: React.FC = () => {
  const stats = [
    {
      icon: <Target className="w-6 h-6 text-primary-foreground" />,
      value: 128,
      suffix: '+',
      label: 'Active Campaigns',
      delay: 0,
    },
    {
      icon: <Users className="w-6 h-6 text-primary-foreground" />,
      value: 1245,
      suffix: '+',
      label: 'Completed Intents',
      delay: 0.1,
    },
    {
      icon: <Activity className="w-6 h-6 text-primary-foreground" />,
      value: 9876,
      suffix: '',
      label: 'Network Activity',
      delay: 0.2,
    },
  ];

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <StatItem key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;