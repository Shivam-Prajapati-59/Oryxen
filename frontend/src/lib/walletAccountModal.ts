import { SOLANA_RPC_URL } from "@/config/env";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Contract, JsonRpcProvider, formatUnits } from "ethers";
import {
  ERC20_BALANCE_ABI,
  ETHEREUM_RPC_URL,
  ETHEREUM_USDC_ADDRESS,
  getWalletTokenLabel,
} from "@/config/walletAccountModal";

const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
const ethereumProvider = new JsonRpcProvider(ETHEREUM_RPC_URL);
const usdcContract = new Contract(
  ETHEREUM_USDC_ADDRESS,
  ERC20_BALANCE_ABI,
  ethereumProvider,
);

export const formatBalance = (value: number) => {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
};

const getSolBalance = async (address: string) => {
  const publicKey = new PublicKey(address);
  const lamports = await solanaConnection.getBalance(publicKey);
  return lamports / LAMPORTS_PER_SOL;
};

const getEthereumUsdcBalance = async (address: string) => {
  const rawBalance = (await usdcContract.balanceOf(address)) as bigint;
  return Number(formatUnits(rawBalance, 6));
};

export const getWalletBalanceLabel = async (
  address: string,
  chainType?: string,
): Promise<string> => {
  try {
    const normalized = chainType?.toLowerCase();
    const tokenLabel = getWalletTokenLabel(chainType);

    if (!tokenLabel) return "--";

    if (normalized === "solana") {
      const solBalance = await getSolBalance(address);
      return `${formatBalance(solBalance)} ${tokenLabel}`;
    }

    if (normalized === "ethereum") {
      const usdcBalance = await getEthereumUsdcBalance(address);
      return `${formatBalance(usdcBalance)} ${tokenLabel}`;
    }

    return "--";
  } catch (error) {
    console.error("Failed to fetch wallet balance:", error);
    return "--";
  }
};
