"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { type WalletInterface } from "starkzap";
import { connectWallet } from "../lib/starkzap";

interface WalletContextType {
  wallet: WalletInterface | null;
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const w = await connectWallet();
      setWallet(w);
      // wallet.address is an Address object — call toString()
      setAddress(w.address.toString());
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes("popup")) {
        alert("Please allow popups for this site and try again.");
      } else {
        console.error("Wallet connect error:", err);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ wallet, address, connecting, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}