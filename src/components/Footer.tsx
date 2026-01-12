import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, FileText, ExternalLink, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/30 bg-space-dark/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyber-gradient flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-sm">I</span>
              </div>
              <span className="font-display font-bold text-lg">INTENT</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Proof of Structured Participation on Arc Network. Create structured intents 
              and generate verifiable on-chain proofs of your actions.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-usdc/20 text-usdc border border-usdc/30">
                Built on Arc Testnet
              </span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
                Chain ID: 5042002
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/proofs" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Intent Proofs
                </Link>
              </li>
              <li>
                <Link to="/create" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Create Campaign
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://testnet.arcscan.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Explorer
                </a>
              </li>
              <li>
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Get Testnet USDC
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1"
                >
                  <Twitter className="w-3 h-3" />
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border/30 mt-8 pt-6">
          <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/30 border border-border/50 mb-6">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> INTENT Proofs are records of structured participation, not financial assets. 
              They have no promised value and should not be purchased or sold for speculative purposes.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2025 INTENT. Proof of Structured Participation.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-xs">
              Powered by AI & Blockchain
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;