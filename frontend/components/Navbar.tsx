"use client";

import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

export function Navbar() {
  const { isConnected, connect, chainId, accounts } = useMetaMaskEthersSigner();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkName = (id: number | undefined) => {
    if (!id) return "未知";
    const names: Record<number, string> = {
      1: "Mainnet",
      11155111: "Sepolia",
      31337: "LocalDev"
    };
    return names[id] || `Chain ${id}`;
  };

  return (
    <nav className="relative w-full bg-black/60 backdrop-blur-xl border-b-2 border-emerald-500/30 sticky top-0 z-50 shadow-lg shadow-emerald-900/20">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo with cyber style */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform">
                <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18.5c-4.28-1.04-7.5-5.28-7.5-9.5V8.3l7.5-3.85 7.5 3.85v2.7c0 4.22-3.22 8.46-7.5 9.5z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
                  CRYPTO
                </span>
                <span className="text-amber-400">LEASE</span>
              </h1>
              <p className="text-[10px] text-emerald-400/70 uppercase tracking-[0.2em] font-bold -mt-1">
                FHE Privacy Protocol
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {isConnected && chainId && (
              <div className="hidden lg:flex items-center space-x-2 bg-emerald-500/10 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-emerald-500/30">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-emerald-300 text-sm font-bold uppercase tracking-wide">
                  {getNetworkName(chainId)}
                </span>
              </div>
            )}
            
            {isConnected && accounts && accounts[0] ? (
              <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 backdrop-blur-sm px-5 py-2.5 rounded-xl border-2 border-emerald-500/40 flex items-center space-x-3 shadow-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-black font-black text-sm shadow-inner">
                  {accounts[0].slice(2, 4).toUpperCase()}
                </div>
                <span className="text-emerald-100 font-mono text-sm font-semibold hidden sm:inline">
                  {formatAddress(accounts[0])}
                </span>
              </div>
            ) : (
              <button
                onClick={connect}
                className="group relative bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-7 py-3 rounded-xl font-bold shadow-xl shadow-emerald-900/50 transition-all hover:shadow-2xl hover:shadow-emerald-700/60 active:scale-95 uppercase tracking-wide"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1M9 12h12m-3-3l3 3-3 3" />
                  </svg>
                  <span>Connect Wallet</span>
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
