"use client";

import {
  StarkZap,
  Amount,
  fromAddress,
  getPresets,
  type WalletInterface,
} from "starkzap";

const NETWORK =
  (process.env.NEXT_PUBLIC_NETWORK as "mainnet" | "sepolia") ?? "sepolia";

let sdkInstance: StarkZap | null = null;

function getSDK(): StarkZap {
  if (!sdkInstance) {
    sdkInstance = new StarkZap({ network: NETWORK });
  }
  return sdkInstance;
}

export async function connectWallet(): Promise<WalletInterface> {
  const sdk = getSDK();
  const wallet = await sdk.connectCartridge({
    policies: [
      {
        target:
          "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
        method: "transfer",
      },
      {
        target:
          "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
        method: "transfer",
      },
    ],
  });
  return wallet;
}

export async function getBalance(
  wallet: WalletInterface,
  tokenSymbol: "USDC" | "STRK"
): Promise<string> {
  const presets = getPresets(wallet.getChainId());
  const token = presets[tokenSymbol];
  const balance = await wallet.balanceOf(token);
  return balance.toFormatted(true);
}

export async function sendTip(
  wallet: WalletInterface,
  recipientAddress: string,
  amount: string,
  tokenSymbol: "USDC" | "STRK"
) {
  const presets = getPresets(wallet.getChainId());
  const token = presets[tokenSymbol];
  const tx = await wallet.transfer(token, [
    {
      to: fromAddress(recipientAddress),
      amount: Amount.parse(amount, token),
    },
  ]);
  await tx.wait();
  return tx;
}

// ── Confidential tip using Tongo ─────────────────────────────────────────────
export async function sendConfidentialTip(
  wallet: WalletInterface,
  recipientAddress: string,
  amount: string,
  tokenSymbol: "USDC" | "STRK"
): Promise<{ success: boolean; message: string; explorerUrl?: string }> {
  // Dynamically import to avoid bundling issues when Tongo not installed
  let TongoConfidential: any;
  try {
    const mod = await import("starkzap");
    TongoConfidential = (mod as any).TongoConfidential;
    if (!TongoConfidential) throw new Error("TongoConfidential not available");
  } catch {
    throw new Error(
      "Confidential transfers unavailable — Tongo SDK not installed"
    );
  }

  const { getOrCreateTongoKey, TONGO_CONTRACTS } = await import("./tongo");
  const presets = getPresets(wallet.getChainId());
  const token = presets[tokenSymbol];
  const contractAddress =
    NETWORK === "mainnet" ? TONGO_CONTRACTS.mainnet : TONGO_CONTRACTS.sepolia;

  // 1. Create sender's confidential instance
  const senderKey = getOrCreateTongoKey();
  const senderConfidential = new TongoConfidential({
    privateKey: senderKey,
    contractAddress,
    provider: wallet.getProvider(),
  });

  // 2. Derive recipient's confidential identity from their Starknet address
  const recipientConfidential = new TongoConfidential({
    privateKey: fromAddress(recipientAddress).toString(), // derive from address
    contractAddress,
    provider: wallet.getProvider(),
  });

  const parsedAmount = Amount.parse(amount, token);

  // 3. Fund sender's confidential account from public balance
  const fundTx = await wallet
    .tx()
    .confidentialFund(senderConfidential, {
      amount: parsedAmount,
      sender: wallet.address,
    })
    .send();
  await fundTx.wait();

  // 4. Send confidential transfer to recipient
  const transferTx = await wallet
    .tx()
    .confidentialTransfer(senderConfidential, {
      amount: parsedAmount,
      to: recipientConfidential.recipientId, // { x, y } public key
      sender: wallet.address,
    })
    .send();
  await transferTx.wait();

  return {
    success: true,
    message: `Private tip of ${amount} ${tokenSymbol} sent — amount hidden onchain`,
    explorerUrl: transferTx.explorerUrl,
  };
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getExplorerUrl(
  txHashOrAddress: string,
  type: "tx" | "account"
): string {
  const base =
    NETWORK === "mainnet"
      ? "https://voyager.online"
      : "https://sepolia.voyager.online";
  return type === "tx"
    ? `${base}/tx/${txHashOrAddress}`
    : `${base}/contract/${txHashOrAddress}`;
}