"use client";

import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { Link2, Check } from "lucide-react";

export default function ShareTipLinkButton() {
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (!address) return;
    const tipUrl = `${window.location.origin}/?address=${encodeURIComponent(address)}`;
    navigator.clipboard.writeText(tipUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!address) return null;

  return (
    <button
      onClick={handleShare}
      title="Copy your personal tip link"
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm 
        font-medium text-[#939393] hover:text-cyan-200 transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" />
          Get Tip Link
        </>
      )}
    </button>
  );
}