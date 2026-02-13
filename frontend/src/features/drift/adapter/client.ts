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

  try {
    await client.subscribe();
  } catch (error) {
    // Ensure cleanup if subscription fails
    await client.unsubscribe();
    throw error;
  }
  return client;
}
