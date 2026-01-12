import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Copy, ExternalLink, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { JazziconAvatar } from '@/components/JazziconAvatar';
import toast from 'react-hot-toast';

const navLinks = [
  { href: '/proofs', label: 'Proofs' },
  { href: '/create', label: 'Create' },
  { href: '/dashboard', label: 'Dashboard' },
];

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const {
    isConnected,
    truncatedAddress,
    address,
    balance,
    isCorrectNetwork,
    isConnecting,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
      setIsDropdownOpen(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-cyber-gradient flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_hsl(189_100%_50%/0.4)] transition-shadow">
              <span className="font-display font-bold text-primary-foreground text-sm">I</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground hidden sm:block">
              INTENT
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  location.pathname === link.href
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet Section */}
          <div className="flex items-center gap-3">
            {!isConnected ? (
              <Button
                variant="wallet"
                size="default"
                onClick={connect}
                disabled={isConnecting}
                className="hidden sm:flex"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </Button>
            ) : !isCorrectNetwork ? (
              <Button
                variant="destructive"
                size="default"
                onClick={switchNetwork}
                className="hidden sm:flex"
              >
                Switch to Arc
              </Button>
            ) : (
              <div className="relative hidden sm:block" ref={dropdownRef}>
                <Button
                  variant="wallet"
                  size="default"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="gap-2"
                >
                  <JazziconAvatar address={address} diameter={20} />
                  <span>{truncatedAddress}</span>
                  <span className="text-usdc font-medium">{balance} USDC</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 glass rounded-xl border border-border/50 shadow-xl overflow-hidden"
                    >
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-secondary transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Dashboard
                      </Link>
                      <button
                        onClick={copyAddress}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-secondary transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Address
                      </button>
                      <div className="border-t border-border/50" />
                      <button
                        onClick={handleDisconnect}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Disconnect
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border/30"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.href
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-2 border-t border-border/30">
                {!isConnected ? (
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={() => {
                      connect();
                      setIsOpen(false);
                    }}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                ) : !isCorrectNetwork ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={switchNetwork}
                  >
                    Switch to Arc Testnet
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-4 py-2 bg-secondary rounded-lg">
                      <div className="flex items-center gap-2">
                        <JazziconAvatar address={address} diameter={24} />
                        <span className="text-sm">{truncatedAddress}</span>
                      </div>
                      <span className="text-usdc font-medium text-sm">{balance} USDC</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        disconnect();
                        setIsOpen(false);
                      }}
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;