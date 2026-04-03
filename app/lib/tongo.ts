"use client";

const TONGO_KEY_STORAGE = "tip_gg_tongo_key";

const STARK_CURVE_ORDER = BigInt(
  "3618502788666131213697322783095070105526743751716087489154079457884512865583"
);

// Generate a random valid Stark scalar as BigInt
function generateValidKey(): bigint {
  while (true) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let value = BigInt(0);
    for (const byte of bytes) {
      value = (value << BigInt(8)) | BigInt(byte);
    }
    if (value >= BigInt(1) && value < STARK_CURVE_ORDER) {
      return value;
    }
  }
}

// Store/retrieve as hex string, return as BigInt
export function getOrCreateTongoKey(): bigint {
  if (typeof window === "undefined") {
    return BigInt(1); // SSR safe minimal valid scalar
  }

  const stored = localStorage.getItem(TONGO_KEY_STORAGE);
  if (stored) {
    try {
      const value = BigInt(stored);
      if (value >= BigInt(1) && value < STARK_CURVE_ORDER) {
        return value;
      }
    } catch {}
    localStorage.removeItem(TONGO_KEY_STORAGE);
  }

  const key = generateValidKey();
  // Store as decimal string — BigInt serializes cleanly this way
  localStorage.setItem(TONGO_KEY_STORAGE, key.toString());
  return key;
}

// Derive a deterministic valid scalar from a Starknet address
// Used to compute a recipient's Tongo public key when we don't have their key
export function deriveRecipientKey(starknetAddress: string): bigint {
  const cleaned = starknetAddress
    .replace("0x", "")
    .toLowerCase()
    .padStart(64, "0");

  let value = BigInt("0x" + cleaned);

  // Clamp to valid range by modulo — keeps it deterministic and always valid
  value = value % (STARK_CURVE_ORDER - BigInt(1));
  if (value < BigInt(1)) value = BigInt(1);

  return value;
}

export function clearTongoKey() {
  localStorage.removeItem(TONGO_KEY_STORAGE);
}

// Rate = how many ERC20 wei = 1 Tongo internal unit
// STRK Sepolia/Mainnet rate from Tongo docs = 50000000000000000 (0.05 STRK)
export const TONGO_RATES = {
  mainnet: {
    STRK: BigInt("50000000000000000"),
    ETH: BigInt("3000000000000"),
  },
  sepolia: {
    STRK: BigInt("50000000000000000"),
    ETH: BigInt("3000000000000"),
  },
} as const;

export const TONGO_CONTRACTS = {
  mainnet: {
    STRK: "0x3a542d7eb73b3e33a2c54e9827ec17a6365e289ec35ccc94dde97950d9db498",
    ETH: "0x276e11a5428f6de18a38b7abc1d60abc75ce20aa3a925e20a393fcec9104f89",
  },
  sepolia: {
    STRK: "0x408163bfcfc2d76f34b444cb55e09dace5905cf84c0884e4637c2c0f06ab6ed",
    ETH: "0x2cf0dc1d9e8c7731353dd15e6f2f22140120ef2d27116b982fa4fed87f6fef5",
    USDC: "0x53b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080",
  },
} as const;

export const STRK_ADDRESSES = {
  mainnet: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  sepolia: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
} as const;