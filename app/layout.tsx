"use client"; 

import { useEffect, useRef } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "./contexts/WalletContext";
import WalletConnection from "./components/WalletConnection";
import ShareTipLinkButton from "./components/ShareTipLinkButton";
import { HandCoins, Zap } from "lucide-react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gridRef.current) {
        // Update CSS variables on the grid div directly
        gridRef.current.style.setProperty("--cursor-x", `${e.clientX}px`);
        gridRef.current.style.setProperty("--cursor-y", `${e.clientY}px`);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#050505] text-slate-200 antialiased selection:bg-purple-500/30">
        
        <WalletProvider>
          {/* THE INTERACTIVE GRID LAYER */}
          <div 
            ref={gridRef} 
            className="interactive-grid fixed inset-0 z-0 pointer-events-none" 
          />

          {/* MAIN CONTENT WRAPPER */}
          <div className="min-h-screen flex flex-col relative z-10 overflow-x-hidden">
            
            <header className="sticky top-0 z-[100] w-full px-4 py-4">
              <nav className="max-w-7xl mx-auto flex items-center justify-between px-2 py-1.5 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-sm shadow-black/50">
                
                <div className="flex items-center gap-3 group">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-600/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl transition-transform group-hover:scale-110">
                      <Zap className="h-5 w-5 text-white fill-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col leading-none">
                    <span className="text-xl font-black tracking-tighter text-white italic">
                      TIP<span className="text-purple-500">.GG</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      Starknet
                    </span>
                  </div>

                  <div className="ml-2 h-8 w-[1px] bg-white/10 hidden sm:block" />
                  <div className="hidden sm:block">
                    <ShareTipLinkButton />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <WalletConnection />
                </div>
                
              </nav>
            </header>

            <main className="flex-1 flex flex-col items-center px-6 py-8 md:py-16">
              {children}
            </main>

            <footer className="py-10 px-6 border-t border-white/5 bg-black/20">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
                  <HandCoins size={16} />
                  <span className="text-xs font-bold tracking-tighter uppercase">Verified by Starknet</span>
                </div>
                <div className="flex gap-8 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                  <a href="#" className="hover:text-purple-400 transition-colors">Privacy</a>
                  <a href="#" className="hover:text-purple-400 transition-colors">Terms</a>
                  <a href="#" className="hover:text-purple-400 transition-colors">Github</a>
                </div>
              </div>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}