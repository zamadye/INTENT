import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, FileText, Info, Shield, Lock, AlertTriangle } from 'lucide-react';
import intentLogo from '@/assets/intent-logo.jpg';
import { ExternalLink } from '@/components/ExternalLink';
import { WalletSecurityInfo } from '@/components/WalletSecurityInfo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/30 bg-space-dark/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={intentLogo} alt="INTENT" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-display font-bold text-lg">INTENT</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Proof of Structured Participation on Arc Network. Create structured intents 
              and generate verifiable on-chain proofs of your actions.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-usdc/20 text-usdc border border-usdc/30">
                Built on Arc Testnet
              </span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
                Chain ID: 5042002
              </span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Secure
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
              <li>
                <Link to="/wallet-diagnostics" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Wallet Diagnostics
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <ExternalLink
                  href="https://testnet.arcscan.app"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Explorer
                </ExternalLink>
              </li>
              <li>
                <ExternalLink
                  href="https://faucet.circle.com"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Get Testnet USDC
                </ExternalLink>
              </li>
              <li>
                <ExternalLink
                  href="https://arc.network"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Arc Network
                </ExternalLink>
              </li>
              <li>
                <WalletSecurityInfo 
                  trigger={
                    <button className="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Security Info
                    </button>
                  }
                />
              </li>
            </ul>
          </div>
        </div>

        {/* Security Disclaimer - Enhanced */}
        <div className="border-t border-border/30 mt-8 pt-6 space-y-4">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 shrink-0">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-400 mb-1">
                🔒 Your Security is Our Priority
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>We NEVER ask for your seed phrase or private keys</strong></li>
                <li>• Wallet connection only - your keys stay in your wallet</li>
                <li>• All signatures show plain text message content</li>
                <li>• Verified domain: <span className="font-mono text-foreground">app-intent.lovable.app</span></li>
              </ul>
            </div>
          </div>

          {/* Phishing Warning */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-500 mb-1">
                ⚠️ Beware of Phishing
              </p>
              <p className="text-xs text-muted-foreground">
                If any website asks for your seed phrase or private keys, it is a SCAM. 
                INTENT only uses secure wallet connections (WalletConnect/MetaMask). 
                Always verify you are on the official domain.
              </p>
            </div>
          </div>

          {/* Original Disclaimer */}
          <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/30 border border-border/50">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> INTENT Proofs are records of structured participation, not financial assets. 
              They have no promised value and should not be purchased or sold for speculative purposes.
              This is a testnet application for demonstration purposes only.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-muted-foreground text-sm">
            © 2025 INTENT. Proof of Structured Participation.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              Secure by Design
            </span>
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