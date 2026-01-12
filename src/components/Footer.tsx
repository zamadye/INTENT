import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, FileText, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/30 bg-space-dark/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyber-gradient flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-sm">A</span>
              </div>
              <span className="font-display font-bold text-lg">Arc Campaign Engine</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              AI-powered campaign builder for Arc Network. Create engaging on-chain proofs 
              and mint them as NFTs on the Arc testnet.
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
                <Link to="/gallery" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Gallery
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

        <div className="border-t border-border/30 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 Arc Campaign Engine. All rights reserved.
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
