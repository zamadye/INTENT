import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster as HotToaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { WalletProvider } from "@/contexts/WalletContext";
import { AccessLevelProvider } from "@/contexts/AccessLevelContext";
import Index from "./pages/Index";
import CreateCampaign from "./pages/CreateCampaign";
import Proofs from "./pages/Proofs";
import Dashboard from "./pages/Dashboard";
import ShareRedirect from "./pages/ShareRedirect";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => {

  return (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <AccessLevelProvider>
            <Toaster />
            <Sonner />
            <HotToaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'hsl(231 50% 12%)',
                  color: 'hsl(210 40% 98%)',
                  border: '1px solid hsl(231 40% 20%)',
                },
              }}
            />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/create" element={<CreateCampaign />} />
                <Route path="/proofs" element={<Proofs />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Share link redirect - /p/:id -> /create */}
                <Route path="/p/:id" element={<ShareRedirect />} />
                {/* Legacy route redirects */}
                <Route path="/marketplace" element={<Proofs />} />
                <Route path="/gallery" element={<Proofs />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AccessLevelProvider>
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
  );
};

export default App;