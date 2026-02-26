use gmsol_sdk::{
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Cancel an open order (limit, TP, SL) by its address.
///
/// This calls `close_order` under the hood which is the protocol's cancel mechanism.
/// Note: The order account must still be live on-chain. On Devnet, keepers process
/// orders extremely fast so this may return NotFound if the order was already executed.
pub async fn cancel_order(
    client: &Client<&Keypair>,
    order_address: &Pubkey,
) -> Result<()> {
    println!("Cancelling order: {}", order_address);

    let mut builder = client
        .close_order(order_address)
        .map_err(|e| { eprintln!("❌ Failed to initialize cancel: {:?}", e); e })?;

    let txn_builder = builder
        .build()
        .await
        .map_err(|e| { eprintln!("❌ Failed to build cancel tx (order may already be gone): {:?}", e); e })?;

    let sig = txn_builder.send().await?;
    println!("✅ Order cancelled! Signature: {}", sig);
    Ok(())
}
