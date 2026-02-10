import { AnchorProvider, BN, Program, Wallet, Idl } from "@coral-xyz/anchor";
import { IDL, type Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";
import { IDL as DovesIDL, type Doves } from "@/lib/idl/doves-idl";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// Cast types to work around Anchor 0.30+ type constraints with legacy IDL format
type PerpetualsIdl = Perpetuals & Idl;
type DovesIdl = Doves & Idl;

export const RPC_CONNECTION = new Connection(
  process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
);

export const DOVES_PROGRAM_ID = new PublicKey(
  "DoVEsk76QybCEHQGzkvYPWLQu9gzNoZZZt3TPiL597e",
);

export const JUPITER_PERPETUALS_PROGRAM_ID = new PublicKey(
  "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu",
);

export const JUPITER_PERPETUALS_EVENT_AUTHORITY_PUBKEY = new PublicKey(
  "37hJBDnntwqhGbK7L6M1bLyvccj4u55CCUiLPdYkiqBN",
);

export const JLP_POOL_ACCOUNT_PUBKEY = new PublicKey(
  "5BUwFW4nRbftYTDMbgxykoFWqWHPzahFSNAaaaJtVKsq",
);

export const JLP_MINT_PUBKEY = new PublicKey(
  "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
);

export const DOVES_PROGRAM = new Program<DovesIdl>(
  DovesIDL as DovesIdl,
  new AnchorProvider(
    RPC_CONNECTION as any,
    new Wallet(Keypair.generate() as any),
    AnchorProvider.defaultOptions(),
  ),
);

export const JUPITER_PERPETUALS_PROGRAM = new Program<PerpetualsIdl>(
  IDL as PerpetualsIdl,
  new AnchorProvider(
    RPC_CONNECTION as any,
    new Wallet(Keypair.generate() as any),
    AnchorProvider.defaultOptions(),
  ),
);

export enum CUSTODY_PUBKEY {
  SOL = "7xS2gz2bTp3fwCC7knJvUWTEU9Tycczu6VhJYKgi1wdz",
  ETH = "AQCGyheWPLeo6Qp9WpYS9m3Qj479t7R636N9ey1rEjEn",
  BTC = "5Pv3gM9JrFFH883SWAhvJC9RPYmo8UNxuFtv5bMMALkm",
  USDC = "G18jKKXQwBbrHeiK3C9MRXhkHsLHf7XgCSisykV46EZa",
  USDT = "4vkNeXiYEUizLdrpdPS1eC2mccyM4NUPRtERrk6ZETkk",
}

export const CUSTODY_PUBKEYS = [
  new PublicKey(CUSTODY_PUBKEY.SOL),
  new PublicKey(CUSTODY_PUBKEY.BTC),
  new PublicKey(CUSTODY_PUBKEY.ETH),
  new PublicKey(CUSTODY_PUBKEY.USDC),
  new PublicKey(CUSTODY_PUBKEY.USDT),
];

export const USDC_DECIMALS = 6;
export const BPS_POWER = new BN(10_000);
export const DBPS_POWER = new BN(100_000);
export const RATE_POWER = new BN(1_000_000_000);
export const DEBT_POWER = RATE_POWER;
export const BORROW_SIZE_PRECISION = new BN(1000);
export const JLP_DECIMALS = 6;
