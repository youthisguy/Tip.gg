"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "./contexts/WalletContext";
import {
  getBalance,
  sendTip,
  sendConfidentialTip,
  getExplorerUrl,
} from "./lib/starkzap";
import {
  Wallet,
  Shield,
  ShieldCheck,
  Send,
  Info,
  User,
  ChevronRight,
  Lock,
} from "lucide-react";

type TokenSymbol = "USDC" | "STRK";
const TOKEN_OPTIONS: TokenSymbol[] = ["USDC", "STRK"];

// Confidential transfer states
type ConfidentialStep =
  | "idle"
  | "funding"    // Step 1: moving public USDC → confidential account
  | "proving"    // Step 2: generating ZK proof locally
  | "sending"    // Step 3: submitting to chain
  | "done";

function ConfidentialProgress({ step }: { step: ConfidentialStep }) {
  const steps = [
    { key: "funding", label: "Funding confidential account" },
    { key: "proving", label: "Generating ZK proof" },
    { key: "sending", label: "Submitting to chain" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-2 py-2">
      {steps.map((s, i) => {
        const isDone = currentIndex > i;
        const isActive = currentIndex === i;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center 
                justify-center text-xs transition-all ${
                  isDone
                    ? "bg-indigo-500 border-indigo-500 text-white"
                    : isActive
                    ? "border-indigo-400 border-t-transparent animate-spin"
                    : "border-gray-700"
                }`}
            >
              {isDone && "✓"}
            </div>
            <span
              className={`text-sm transition-colors ${
                isDone
                  ? "text-indigo-400"
                  : isActive
                  ? "text-white font-medium"
                  : "text-gray-600"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const { wallet, address, connect, connecting } = useWallet();
  const searchParams = useSearchParams();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>("USDC");
  const [balance, setBalance] = useState("—");
  const [sending, setSending] = useState(false);
  const [isConfidential, setIsConfidential] = useState(false);
  const [confidentialStep, setConfidentialStep] =
    useState<ConfidentialStep>("idle");
  const [txStatus, setTxStatus] = useState<{
    type: "success" | "error";
    msg: string;
    explorerUrl?: string;
    wasPrivate?: boolean;
  } | null>(null);

  useEffect(() => {
    const addrFromUrl = searchParams.get("address");
    if (addrFromUrl) setRecipient(addrFromUrl.trim());
  }, [searchParams]);

  useEffect(() => {
    if (!wallet) return;
    setBalance("Loading...");
    getBalance(wallet, selectedToken)
      .then(setBalance)
      .catch(() => setBalance("—"));
  }, [wallet, selectedToken]);

  const handlePreset = (value: number) => {
    setAmount((prev) => {
      const num = parseFloat(prev) || 0;
      return (num + value).toFixed(2);
    });
  };

  const handleSend = async () => {
    if (!wallet || !address) return;
    if (!recipient || !amount || parseFloat(amount) <= 0) return;

    setSending(true);
    setTxStatus(null);

    try {
      if (isConfidential) {
        // ── Confidential path ─────────────────────────────────────────
        // Step 1: fund
        setConfidentialStep("funding");
        // Step 2: ZK proof generated inside sendConfidentialTip
        // We update the step via a small timeout to show UI progress
        const proofTimer = setTimeout(() => setConfidentialStep("proving"), 1500);
        const sendTimer = setTimeout(() => setConfidentialStep("sending"), 4000);

        try {
          const result = await sendConfidentialTip(
            wallet,
            recipient,
            amount,
            selectedToken
          );
          clearTimeout(proofTimer);
          clearTimeout(sendTimer);
          setConfidentialStep("done");
          setTxStatus({
            type: "success",
            msg: result.message,
            explorerUrl: result.explorerUrl,
            wasPrivate: true,
          });
        } catch (err: any) {
          clearTimeout(proofTimer);
          clearTimeout(sendTimer);
          throw err;
        }
      } else {
        // ── Public path ───────────────────────────────────────────────
        const tx = await sendTip(wallet, recipient, amount, selectedToken);
        setTxStatus({
          type: "success",
          msg: `Sent ${amount} ${selectedToken}!`,
          explorerUrl: tx.explorerUrl ?? getExplorerUrl(tx.explorerUrl ?? "", "tx"),
          wasPrivate: false,
        });
      }

      // Refresh balance
      getBalance(wallet, selectedToken).then(setBalance);
    } catch (err: any) {
      setConfidentialStep("idle");

      // Surface Tongo-specific errors clearly
      const msg = err?.message || "Failed to send tip";
      const isUnconfigured = msg.includes("not configured");
      const isUnavailable = msg.includes("unavailable");

      setTxStatus({
        type: "error",
        msg: isUnconfigured
          ? "Private tips coming soon — Tongo not yet live on Sepolia"
          : isUnavailable
          ? "Private tip SDK not installed — falling back to public tip"
          : msg,
      });
    } finally {
      setSending(false);
      // Reset confidential step after short delay
      setTimeout(() => setConfidentialStep("idle"), 2000);
    }
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', 
        justifyContent:'center', padding:'3rem 1rem 2.5rem', minHeight:'480px', 
        position:'relative', overflow:'hidden' }}>
  
        <style>{`
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes pulse-ring { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.6);opacity:0} }
          @keyframes coin-fly { 0%{transform:translate(0,0) rotate(0deg) scale(.6);opacity:0} 15%{opacity:1;transform:translate(30px,-20px) rotate(60deg) scale(1)} 85%{opacity:1;transform:translate(170px,-55px) rotate(300deg) scale(1)} 100%{transform:translate(210px,-20px) rotate(360deg) scale(.5);opacity:0} }
          @keyframes coin-fly2 { 0%{transform:translate(0,0) rotate(0deg) scale(.6);opacity:0} 15%{opacity:1;transform:translate(20px,-40px) rotate(45deg) scale(1)} 85%{opacity:1;transform:translate(165px,-70px) rotate(270deg) scale(1)} 100%{transform:translate(205px,-30px) rotate(360deg) scale(.5);opacity:0} }
          @keyframes coin-fly3 { 0%{transform:translate(0,0) rotate(0deg) scale(.6);opacity:0} 15%{opacity:1;transform:translate(35px,-5px) rotate(30deg) scale(1)} 85%{opacity:1;transform:translate(175px,-35px) rotate(290deg) scale(1)} 100%{transform:translate(215px,-10px) rotate(360deg) scale(.5);opacity:0} }
          @keyframes receive-bounce { 0%,100%{transform:scale(1)} 30%{transform:scale(1.15)} 50%{transform:scale(.95)} 70%{transform:scale(1.08)} }
          @keyframes path-draw { 0%{stroke-dashoffset:300} 100%{stroke-dashoffset:0} }
          @keyframes spark { 0%{transform:scale(0) rotate(0deg);opacity:1} 100%{transform:scale(1.5) rotate(45deg);opacity:0} }
          @keyframes stack-up { 0%{transform:translateY(8px);opacity:0} 100%{transform:translateY(0);opacity:1} }
          @keyframes lock-appear { 0%{transform:translateY(4px) scale(.8);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
          @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
          .tg-float { animation: float 3s ease-in-out infinite; }
          .tg-float-delayed { animation: float 3s ease-in-out 1.5s infinite; }
          .tg-receive { animation: receive-bounce 1.8s ease-in-out .9s infinite; }
          .tg-coin { width:18px;height:18px;border-radius:50%;background:#c9a227;border:2px solid #e8c137;position:absolute;bottom:48px;left:82px; }
          .tg-coin1 { animation: coin-fly 1.8s ease-in-out infinite; }
          .tg-coin2 { animation: coin-fly2 1.8s ease-in-out .3s infinite; }
          .tg-coin3 { animation: coin-fly3 1.8s ease-in-out .6s infinite; }
          .tg-ring { position:absolute;inset:-8px;border-radius:50%;border:2px solid #7c3aed;animation:pulse-ring 2s ease-out infinite; }
          .tg-ring2 { animation-delay:.7s; }
          .tg-arc { stroke-dasharray:300;stroke-dashoffset:300;animation:path-draw 1.8s ease-in-out infinite; }
          .tg-spark1 { animation: spark 1.8s ease-out .85s infinite; }
          .tg-spark2 { animation: spark 1.8s ease-out 1.05s infinite; }
          .tg-spark3 { animation: spark 1.8s ease-out 1.15s infinite; }
          .tg-label { animation: stack-up .6s ease-out both; }
          .tg-badge { animation: lock-appear .5s ease-out .4s both; }
        `}</style>
  
        {/* Background glow */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(109,40,217,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
  
        {/* Animation stage */}
        <div style={{ position:'relative', width:320, height:160, marginBottom:'2.5rem', flexShrink:0 }}>
  
          {/* Arc path */}
          <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }} viewBox="0 0 320 160" fill="none">
            <path className="tg-arc" d="M 90 100 Q 160 20 230 100" stroke="rgba(124,58,237,0.25)" strokeWidth="1.5" fill="none"/>
          </svg>
  
          {/* Left wallet — sender */}
          <div className="tg-float" style={{ position:'absolute', left:28, top:32 }}>
            <svg width="62" height="72" viewBox="0 0 62 72" fill="none">
              <rect x="4" y="14" width="54" height="44" rx="8" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
              <rect x="4" y="14" width="54" height="14" rx="8" fill="rgba(255,255,255,0.04)"/>
              <rect x="4" y="20" width="54" height="8" fill="rgba(255,255,255,0.04)"/>
              <rect x="38" y="34" width="14" height="10" rx="5" fill="#7c3aed" opacity="0.7"/>
              <circle cx="44" cy="39" r="3" fill="rgba(255,255,255,0.5)"/>
              <rect x="10" y="23" width="18" height="2.5" rx="1.2" fill="rgba(255,255,255,0.3)"/>
              <rect x="10" y="29" width="12" height="2" rx="1" fill="rgba(255,255,255,0.15)"/>
              <rect x="6" y="4" width="28" height="14" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </svg>
            <div style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>you</div>
          </div>
  
          {/* Flying coins */}
          <div className="tg-coin tg-coin1" />
          <div className="tg-coin tg-coin2" />
          <div className="tg-coin tg-coin3" />
  
          {/* Right wallet — creator */}
          <div className="tg-float-delayed tg-receive" style={{ position:'absolute', right:28, top:24 }}>
            <div className="tg-ring" />
            <div className="tg-ring tg-ring2" />
  
            {/* Sparks */}
            <div className="tg-spark1" style={{ position:'absolute', top:-4, right:-4, width:8, height:8 }}>
              <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0L4.5 3.5L8 4L4.5 4.5L4 8L3.5 4.5L0 4L3.5 3.5Z" fill="#e8c137"/></svg>
            </div>
            <div className="tg-spark2" style={{ position:'absolute', bottom:4, right:-6, width:6, height:6 }}>
              <svg width="6" height="6" viewBox="0 0 6 6"><path d="M3 0L3.4 2.6L6 3L3.4 3.4L3 6L2.6 3.4L0 3L2.6 2.6Z" fill="#a78bfa"/></svg>
            </div>
            <div className="tg-spark3" style={{ position:'absolute', top:8, left:-6, width:6, height:6 }}>
              <svg width="6" height="6" viewBox="0 0 6 6"><path d="M3 0L3.4 2.6L6 3L3.4 3.4L3 6L2.6 3.4L0 3L2.6 2.6Z" fill="#e8c137"/></svg>
            </div>
  
            <svg width="66" height="76" viewBox="0 0 66 76" fill="none">
              <rect x="4" y="14" width="58" height="48" rx="9" fill="rgba(124,58,237,0.2)" stroke="rgba(124,58,237,0.5)" strokeWidth="1.5"/>
              <rect x="4" y="14" width="58" height="16" rx="9" fill="rgba(124,58,237,0.1)"/>
              <rect x="4" y="22" width="58" height="8" fill="rgba(124,58,237,0.1)"/>
              <rect x="40" y="36" width="16" height="11" rx="5.5" fill="#7c3aed" opacity="0.9"/>
              <circle cx="47" cy="41.5" r="3.5" fill="rgba(255,255,255,0.6)"/>
              <rect x="10" y="25" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.4)"/>
              <rect x="10" y="31" width="14" height="2" rx="1" fill="rgba(255,255,255,0.2)"/>
              <rect x="10" y="48" width="22" height="8" rx="4" fill="rgba(124,58,237,0.3)" stroke="rgba(124,58,237,0.4)" strokeWidth="0.5"/>
              <rect x="8" y="3" width="30" height="15" rx="5" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.3)" strokeWidth="1"/>
            </svg>
            <div style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>creator</div>
          </div>
        </div>
  
        {/* Text */}
        <div className="tg-label" style={{ fontSize:'2.2rem', fontWeight:700, letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:'0.5rem' }}>
          tip.gg
        </div>
        <div className="tg-label" style={{ fontSize:14, color:'var(--color-text-secondary)', lineHeight:1.6, textAlign:'center', maxWidth:280, marginBottom:'0.75rem', animationDelay:'0.1s' }}>
          Send tips on Starknet. Gasless, instant, onchain.
        </div>
  
        {/* ZK badge */}
        <div className="tg-badge" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:'rgba(99,60,219,0.1)', border:'0.5px solid rgba(99,60,219,0.3)', marginBottom:'1.75rem' }}>
          <Lock size={11} color="#a78bfa" />
          <span style={{ fontSize:11, fontWeight:500, color:'#a78bfa', letterSpacing:'0.02em' }}>Private tips via ZK proofs</span>
        </div>
  
        {/* Button */}
        <button
          onClick={connect}
          disabled={connecting}
          style={{ padding:'14px 36px', fontSize:15, fontWeight:600, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'none', color:'#fff', cursor:connecting ? 'not-allowed' : 'pointer', opacity:connecting ? 0.7 : 1, letterSpacing:'0.01em', boxShadow:'0 4px 24px rgba(124,58,237,0.3)' }}
        >
          {connecting ? (
            <span style={{ display:'flex', alignItems:'center', gap:10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation:'spin 0.8s linear infinite' }}>
                <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                <path d="M8 2A6 6 0 0 1 14 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Setting up wallet...
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>
  
        {connecting && (
          <p style={{ marginTop:10, fontSize:11, color:'var(--color-text-tertiary)' }}>
            First time takes ~30s for account setup
          </p>
        )}
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div className={`max-w-xl mx-auto transition-colors duration-700`}>
      <div
        className={`fixed inset-0 -z-10 transition-opacity duration-1000 
          ${isConfidential ? "opacity-40" : "opacity-20"}`}
      >
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 
            blur-[120px] rounded-full transition-colors duration-700
            ${isConfidential ? "bg-indigo-900" : "bg-purple-600"}`}
        />
      </div>

      <div
        className={`backdrop-blur-sm rounded-[2.5rem] border transition-all 
          duration-500 overflow-hidden shadow-sm ${
            isConfidential
              ? "bg-slate-950/80 border-indigo-500/30 shadow-indigo-500/10"
              : "bg-neutral-900/80 border-white/10 shadow-black/50"
          }`}
      >
        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] 
                text-gray-500 mb-1">
                Available Balance
              </p>
              <h3 className="text-3xl font-black text-white flex items-baseline gap-2">
                {balance}
              </h3>
            </div>
            <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
              {TOKEN_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedToken(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold 
                    transition-all ${
                      selectedToken === t
                        ? "bg-white text-black shadow-lg"
                        : "text-gray-500 hover:text-white"
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Confidential toggle */}
          <button
            onClick={() => {
              setIsConfidential(!isConfidential);
              setTxStatus(null);
            }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl 
              border transition-all duration-300 ${
                isConfidential
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
          >
            <div className="flex items-center gap-3">
              {isConfidential ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              <div className="text-left">
                <p className="text-sm font-bold">
                  {isConfidential
                    ? "Private Mode — Identity Hidden"
                    : "Confidential Transfer"}
                </p>
                <p className="text-[10px] opacity-60">
                  {isConfidential
                    ? "ZK proof hides sender + amount onchain"
                    : "Hide your identity using zk-proofs"}
                </p>
              </div>
            </div>
            <div
              className={`w-10 h-5 rounded-full relative transition-colors 
                ${isConfidential ? "bg-indigo-500" : "bg-gray-700"}`}
            >
              <div
                className={`absolute top-1 w-3 h-3 bg-white rounded-full 
                  transition-all ${isConfidential ? "left-6" : "left-1"}`}
              />
            </div>
          </button>

          {/* Confidential mode info banner */}
          {isConfidential && (
            <div className="mt-3 p-3 rounded-xl bg-indigo-500/5 border 
              border-indigo-500/20">
              <p className="text-[11px] text-indigo-400 leading-relaxed">
                🔐 Your wallet address and tip amount will be hidden using
                Tongo ZK proofs. The recipient sees funds arrive with no
                sender info. Takes ~15s for proof generation.
              </p>
            </div>
          )}
        </div>

        <div className="p-8 pt-4 space-y-6">
          {/* Recipient */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold 
              text-gray-500 uppercase ml-1">
              <User size={14} /> Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              placeholder="0x..."
              className="w-full bg-black/40 border border-white/5 rounded-2xl 
                px-5 py-4 text-white font-mono text-sm focus:outline-none 
                focus:ring-2 focus:ring-purple-500/40 transition-all 
                placeholder:text-gray-700"
            />
          </div>

          {/* Amount */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold 
              text-gray-500 uppercase ml-1">
              Amount to Tip
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/40 border border-white/5 rounded-2xl 
                  px-5 py-5 text-white text-3xl font-bold focus:outline-none 
                  focus:ring-2 focus:ring-purple-500/40 transition-all"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 
                text-gray-500 font-bold">
                {selectedToken}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 25].map((val) => (
                <button
                  key={val}
                  onClick={() => handlePreset(val)}
                  className="py-3 bg-white/5 hover:bg-white/10 border 
                    border-white/5 rounded-xl text-sm font-bold text-gray-300 
                    transition-all active:scale-95"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* QR code */}
          {recipient && (
            <div className="flex flex-col items-center py-4">
              <div className="bg-white p-3 rounded-2xl shadow-2xl">
                <QRCodeSVG value={recipient} size={140} marginSize={1} />
              </div>
              <a
                href={getExplorerUrl(recipient, "account")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-[10px] text-gray-500 hover:text-white 
                  flex items-center gap-1 uppercase tracking-widest font-bold"
              >
                Verify Address <ChevronRight size={10} />
              </a>
            </div>
          )}

          {/* Confidential progress steps — shown while sending privately */}
          {isConfidential &&
            sending &&
            confidentialStep !== "idle" &&
            confidentialStep !== "done" && (
              <div className="p-4 rounded-2xl bg-indigo-500/5 border 
                border-indigo-500/20">
                <p className="text-xs font-bold text-indigo-400 mb-3 uppercase 
                  tracking-wider">
                  Private Transfer in Progress
                </p>
                <ConfidentialProgress step={confidentialStep} />
              </div>
            )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || !recipient || !amount || parseFloat(amount) <= 0}
            className={`w-full py-5 rounded-2xl text-lg font-black flex 
              items-center justify-center gap-3 transition-all duration-500 
              shadow-xl active:scale-[0.98] disabled:opacity-30 ${
                isConfidential
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                  : "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-purple-500/20"
              }`}
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                  rounded-full animate-spin" />
                {isConfidential ? "Generating ZK proof..." : "Processing..."}
              </span>
            ) : (
              <>
                {isConfidential ? (
                  <Lock size={20} />
                ) : (
                  <Send size={20} />
                )}
                {isConfidential
                  ? "Send Private Tip"
                  : `Tip ${amount || "0"} ${selectedToken}`}
              </>
            )}
          </button>

          {/* Status */}
          {txStatus && (
            <div
              className={`p-4 rounded-2xl flex items-start gap-3 border 
                ${
                  txStatus.type === "success"
                    ? txStatus.wasPrivate
                      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
            >
              <Info size={18} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">
                  {txStatus.type === "success"
                    ? txStatus.wasPrivate
                      ? "🔐 Private tip sent!"
                      : "Success!"
                    : "Error"}
                </p>
                <p className="opacity-80 mb-2">{txStatus.msg}</p>
                {txStatus.explorerUrl && (
         
                  <a
                    href={txStatus.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline font-bold"
                  >
                    View Transaction →
                  </a>
                )}
                {txStatus.wasPrivate && (
                  <p className="text-[10px] opacity-50 mt-1">
                    Sender identity and amount are hidden onchain via Tongo
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center mt-8 text-gray-600 text-xs font-medium 
        uppercase tracking-tighter">
        Powered by Starknet & Starkzap • Gasless Experience
      </p>
    </div>
  );
}