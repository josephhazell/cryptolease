import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "CryptoLease | FHE Privacy Rental",
  description: "赛博朋克风格的隐私租赁平台 - 基于 FHEVM 全同态加密"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gradient-to-br from-[#0a0e1a] via-gray-900 to-black text-gray-100 antialiased relative overflow-x-hidden">
        {/* Background grid pattern */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#10b98120_1px,transparent_1px),linear-gradient(to_bottom,#10b98120_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-20"></div>
        
        {/* Animated gradient orbs */}
        <div className="fixed top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div className="fixed bottom-20 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>

        <Providers>
          <div className="relative min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 lg:px-12 py-10">
              {children}
            </main>
            <footer className="relative w-full bg-black/40 backdrop-blur-lg border-t-2 border-emerald-500/20 py-8">
              <div className="max-w-7xl mx-auto px-6 text-center">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest">
                    CryptoLease Protocol
                  </p>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-500 text-xs">
                  Powered by FHEVM • Fully Homomorphic Encryption • Zero-Knowledge Privacy
                </p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
