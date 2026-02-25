use gmsol_sdk::{
    builders::order::UpdateOrderParams,
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Update an existing order.
///
/// This function updates an open order on the GMX market.
/// It uses the `update_order` method from the SDK.
///
/// ## Parameters
/// - `client`: The initialized GMX client with a payer keypair.
/// - `store`: The store account public key.
/// - `market_token`: The market token mint public key.
/// - `order_id`: The public key of the order to update.
/// - `new_trigger_price`: The new trigger price to set.
pub async fn update_order(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    order_id: &Pubkey,
    new_trigger_price: u128,
) -> Result<()> {
    println!("Attempting to update order: {}", order_id);

    // Create parameters for the update
    let params = UpdateOrderParams::builder()
        .trigger_price(new_trigger_price)
        .build();

    // build() is not needed here because client.update_order returns a TransactionBuilder directly (wrapped in Result)
    let txn_builder = client.update_order(
        store, 
        market_token, 
        order_id, 
        params.into(), 
        None // hint
    ).await?;

    // Send the transaction.
    let signature = txn_builder.send().await?;

    println!("✅ Order updated successfully!");
    println!("Signature: {}", signature);

    Ok(())
}
