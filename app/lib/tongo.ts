"use client";

// Tongo key stored in localStorage per user session
// this should be encrypted server-side
const TONGO_KEY_STORAGE = "tip_gg_tongo_key";

export function getOrCreateTongoKey(): Uint8Array {
  if (typeof window === "undefined") return new Uint8Array(32);

  const stored = localStorage.getItem(TONGO_KEY_STORAGE);
  if (stored) {
    return new Uint8Array(JSON.parse(stored));
  }

  // Generate new random 32-byte key
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  localStorage.setItem(TONGO_KEY_STORAGE, JSON.stringify(Array.from(key)));
  return key;
}

export function clearTongoKey() {
  localStorage.removeItem(TONGO_KEY_STORAGE);
}

export const TONGO_CONTRACTS = {
  mainnet: {
    STRK: "0x3a542d7eb73b3e33a2c54e9827ec17a6365e289ec35ccc94dde97950d9db498",
    ETH:  "0x276e11a5428f6de18a38b7abc1d60abc75ce20aa3a925e20a393fcec9104f89",
  },
  sepolia: {
    STRK: "0x408163bfcfc2d76f34b444cb55e09dace5905cf84c0884e4637c2c0f06ab6ed",
    ETH:  "0x2cf0dc1d9e8c7731353dd15e6f2f22140120ef2d27116b982fa4fed87f6fef5",
    USDC: "0x53b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080",
  },
};