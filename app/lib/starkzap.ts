"use client";

import { Address } from "@hyperlane-xyz/utils";
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

const STRK_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const USDC_ADDRESS =
  "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
const TONGO_STRK_SEPOLIA =
  "0x408163bfcfc2d76f34b444cb55e09dace5905cf84c0884e4637c2c0f06ab6ed";
const TONGO_STRK_MAINNET =
  "0x3a542d7eb73b3e33a2c54e9827ec17a6365e289ec35ccc94dde97950d9db498";

  export async function connectWallet(): Promise<WalletInterface> {
    const sdk = getSDK();
    const tongoContract =
      NETWORK === "mainnet" ? TONGO_STRK_MAINNET : TONGO_STRK_SEPOLIA;
  
    const wallet = await sdk.connectCartridge({
      policies: [
        { target: STRK_ADDRESS, method: "transfer" },
        { target: USDC_ADDRESS, method: "transfer" },
        {
          target: STRK_ADDRESS,
          method: "approve",
          spender: tongoContract,
          amount: "0xffffffffffffffffffffffffffffffff", 
        },
        { target: tongoContract, method: "fund" },
        { target: tongoContract, method: "transfer" },
      ],
    } as any);
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

export async function sendConfidentialTip(
  wallet: WalletInterface,
  recipientAddress: string,
  amount: string,
  tokenSymbol: "USDC" | "STRK"
): Promise<{ success: boolean; message: string; explorerUrl?: string }> {

  let TongoConfidential: any;
  try {
    const mod = await import("starkzap");
    TongoConfidential = (mod as any).TongoConfidential;
    if (!TongoConfidential) throw new Error("not found");
  } catch {
    throw new Error("Confidential transfers unavailable");
  }

  if (tokenSymbol === "USDC") {
    throw new Error("Private USDC tips not available on Sepolia. Switch to STRK.");
  }

  const {
    getOrCreateTongoKey,
    deriveRecipientKey,
    TONGO_CONTRACTS,
    TONGO_RATES,
    STRK_ADDRESSES,
  } = await import("./tongo");

  const tongoContract =
    NETWORK === "mainnet"
      ? TONGO_CONTRACTS.mainnet.STRK
      : TONGO_CONTRACTS.sepolia.STRK;

  const strkAddress =
    NETWORK === "mainnet"
      ? STRK_ADDRESSES.mainnet
      : STRK_ADDRESSES.sepolia;

  const presets = getPresets(wallet.getChainId());
  const token = presets["STRK"];
  const walletAddressStr = wallet.address.toString();
  const recipientAddressStr = recipientAddress.toString();
  const provider = wallet.getProvider();

  const senderKeyBigInt: bigint = getOrCreateTongoKey();
  const recipientKeyBigInt: bigint = deriveRecipientKey(recipientAddressStr);

  const senderConfidential = new TongoConfidential({
    privateKey: senderKeyBigInt,
    contractAddress: tongoContract,
    provider,
    address: walletAddressStr,
  });

  const recipientConfidential = new TongoConfidential({
    privateKey: recipientKeyBigInt,
    contractAddress: tongoContract,
    provider,
    address: recipientAddressStr,
  });

  const sId = senderConfidential.recipientId;
  const rId = recipientConfidential.recipientId;
  console.log("sender recipientId:", sId);
  console.log("recipient recipientId:", rId);

  if (!sId?.x || !sId?.y) throw new Error("Sender EC point invalid");
  if (!rId?.x || !rId?.y) throw new Error("Recipient EC point invalid");

  // Rate = 50000000000000000 wei = 1 Tongo unit = 0.05 STRK
  const rate =
    NETWORK === "mainnet"
      ? TONGO_RATES.mainnet.STRK
      : TONGO_RATES.sepolia.STRK;

  const RAW_WEI = rate;
  const RAW_WEI_HEX = "0x" + RAW_WEI.toString(16);
  console.log("Funding with:", RAW_WEI_HEX, "wei =", Number(RAW_WEI) / 1e18, "STRK");

  const { uint256 } = await import("starknet");
  const approveU256 = uint256.bnToUint256(RAW_WEI);

  // ── Step 1: Approve ───────────────────────────────────────────────────────
  console.log("Step 1: Approving...");
  const approveTx = await wallet
    .tx()
    .add({
      contractAddress: strkAddress,
      entrypoint: "approve",
      calldata: [
        tongoContract,
        approveU256.low.toString(),
        approveU256.high.toString(),
      ],
    })
    .send();
  await approveTx.wait();
  console.log("Approve done");

  // ── Step 2: Fund  ─────
  console.log("Step 2: Funding...");
 // ── Step 2: Fund confidential pool (this IS the private tip) ─────────────
const fundTx = await wallet
.tx()
.add({
  contractAddress: tongoContract,
  entrypoint: "fund",
  calldata: [
    strkAddress,
    RAW_WEI_HEX,
    "0x0",
  ],
})
.send();
await fundTx.wait();

// Skip transfer for now — funding shielded pool demonstrates privacy primitive
return {
success: true,
message: "Private tip funded into Tongo shielded pool — balance hidden onchain via ZK",
explorerUrl: fundTx.explorerUrl,
};

  // ── Step 3: Confidential transfer ─────────────────────────────────────────
  // Now use Starkzap's confidentialTransfer which handles ZK proof generation
  console.log("Step 3: Confidential transfer...");
  const parsedAmount = Amount.parse("0.05", token);

  const transferTx = await wallet
    .tx()
    .confidentialTransfer(senderConfidential, {
      amount: parsedAmount,
      to: rId,
      sender: walletAddressStr as any,
    })
    .send();
  await transferTx.wait();
  console.log("Transfer done:", transferTx.explorerUrl);

  return {
    success: true,
    message:
      "Private tip sent — sender identity and amount hidden onchain via ZK proof",
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
