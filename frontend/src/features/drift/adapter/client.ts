import { DriftClient, initialize, type IWallet } from "@drift-labs/sdk-browser";
import { Connection, PublicKey } from "@solana/web3.js";
import { createPrivyWalletAdapter } from "@/lib/solana";
import { DRIFT_ENV, DRIFT_RPC_URL, DRIFT_CHAIN_PREFIX } from "../constants";

let _connection: Connection | null = null;

export function getDriftConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(DRIFT_RPC_URL, "confirmed");
  }
  return _connection;
}

const sdkConfig = initialize({ env: DRIFT_ENV });

export { sdkConfig };
/**
 * Build, subscribe and return a DriftClient.
 *
 * The returned client is fully subscribed — caller is responsible for
 * calling `client.unsubscribe()` on cleanup.
 */
export async function createDriftClient(
  privyWallet: any,
): Promise<DriftClient> {
  const connection = getDriftConnection();

  const wallet = createPrivyWalletAdapter(
    privyWallet,
    DRIFT_CHAIN_PREFIX,
  ) as unknown as IWallet;

  const client = new DriftClient({
    connection,
    wallet,
    env: DRIFT_ENV,
    programID: new PublicKey(sdkConfig.DRIFT_PROGRAM_ID),
  });

  // Temporarily suppress noisy "ws error: undefined" from the Drift SDK
  // These come from Helius devnet WS rate limits (429s) and auto-recover internally
  const originalError = console.error;
  const originalWarn = console.warn;
  let wsErrorCount = 0;
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (msg.includes("ws error")) {
      wsErrorCount++;
      return; // suppress
    }
    originalError.apply(console, args);
  };

  try {
    await client.subscribe();

    // Restore original console after subscription settles
    setTimeout(() => {
      console.error = originalError;
      console.warn = originalWarn;
      if (wsErrorCount > 0) {
        console.warn(
          `[Drift] Suppressed ${wsErrorCount} WS error(s) during init (Helius rate limits — normal on devnet)`,
        );
      }
    }, 5000);
  } catch (error) {
    console.error = originalError;
    console.warn = originalWarn;
    // Ensure cleanup if subscription fails
    try {
      await client.unsubscribe();
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
  return client;
}
