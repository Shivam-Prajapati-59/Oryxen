use gmsol_sdk::{
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Market Decrease — closes or reduces a position at current market price.
pub async fn close_position(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_long: bool,
    is_collateral_token_long: bool,
    size_delta_usd: u128,
    collateral_withdrawal_amount: u64,
) -> Result<()> {
    println!(
        "Closing {} position | Market: {} | Size: {} | Collateral withdrawal: {}",
        if is_long { "LONG" } else { "SHORT" }, market_token, size_delta_usd, collateral_withdrawal_amount
    );

    let market = client.market_by_token(store, market_token).await?;
    let collateral_mint = if is_collateral_token_long { market.meta.long_token_mint } else { market.meta.short_token_mint };
    let collateral_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), &collateral_mint);

    let mut builder = client.market_decrease(
        store, market_token, is_collateral_token_long, collateral_withdrawal_amount, is_long, size_delta_usd,
    );
    builder.initial_collateral_token(&collateral_mint, Some(&collateral_ata));

    let (txn_builder, order_address) = builder.build_with_address().await?;
    let sig = txn_builder.send().await?;
    println!("✅ Position close order placed! Tx: {} | Order: {}", sig, order_address);
    Ok(())
}
