"use client";

import { useWallet } from "../contexts/WalletContext";
import { formatAddress } from "../lib/starkzap";
import { Wallet, LogOut } from "lucide-react";

export default function WalletConnection() {
  const { address, connecting, connect, disconnect } = useWallet();

  if (!address) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className="flex items-center gap-2 bg-white hover:bg-gray-100 
          text-black font-medium py-2.5 px-5 rounded-xl transition-all 
          disabled:opacity-60 shadow-sm text-sm"
      >
        {connecting ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 
            border-black border-r-transparent" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="bg-[#2a2a2a] border border-[#444] px-3 py-2 
        rounded-xl text-sm font-mono text-[#939393]">
        {formatAddress(address)}
      </div>
      <button
        onClick={disconnect}
        title="Disconnect"
        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 
          p-2.5 rounded-xl transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}