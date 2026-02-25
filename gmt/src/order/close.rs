use gmsol_sdk::{
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

pub async fn close_order(
    client: &Client<&Keypair>,
    order_address: &Pubkey,
) -> Result<()> {
    println!("Attempting to close order: {}", order_address);

    // Step 1: Initialization
    let mut builder = match client.close_order(order_address) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("❌ Failed to initialize close_order: {:?}", e);
            return Err(e.into()); // Added .into() here
        }
    };

    // Step 2: Building (RPC fetching happens here)
    let txn_builder = match builder.build().await {
        Ok(tb) => tb,
        Err(e) => {
            eprintln!("❌ Failed to build transaction (Hint/RPC issue): {:?}", e);
            return Err(e.into()); // Added .into() here
        }
    };

    // Step 3: Sending (On-chain execution)
    let signature = match txn_builder.send().await {
        Ok(sig) => sig,
        Err(e) => {
            eprintln!("❌ Transaction failed on-chain: {:?}", e);
            return Err(e.into()); // Added .into() here
        }
    };

    println!("✅ Order closed successfully! Signature: {}", signature);
    Ok(())
}