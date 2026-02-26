use gmsol_sdk::{
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

async fn send_decrease_order(
    client: &Client<&Keypair>,
    builder: gmsol_sdk::ops::exchange::order::CreateOrderBuilder<'_, &Keypair>,
    is_collateral_token_long: bool,
    market_token: &Pubkey,
    store: &Pubkey,
) -> Result<(String, Pubkey)> {
    let market = client.market_by_token(store, market_token).await?;
    let collateral_mint = if is_collateral_token_long { market.meta.long_token_mint } else { market.meta.short_token_mint };
    let collateral_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), &collateral_mint);

    let mut builder = builder;
    builder.initial_collateral_token(&collateral_mint, Some(&collateral_ata));
    let (txn_builder, order_address) = builder.build_with_address().await?;
    let sig = txn_builder.send().await?;
    Ok((sig.to_string(), order_address))
}

/// Take Profit — LimitDecrease triggered when price reaches target profit level.
pub async fn take_profit(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_long: bool,
    is_collateral_token_long: bool,
    size_delta_usd: u128,
    take_profit_price: u128,
) -> Result<()> {
    println!(
        "Creating TAKE PROFIT order | {} | Size: {} | TP Price: {}",
        if is_long { "LONG" } else { "SHORT" }, size_delta_usd, take_profit_price
    );

    let builder = client.limit_decrease(
        store, market_token, is_long, size_delta_usd, take_profit_price,
        is_collateral_token_long, 0,
    );

    let (sig, order) = send_decrease_order(client, builder, is_collateral_token_long, market_token, store).await?;
    println!("✅ Take Profit order placed! Tx: {} | Order: {}", sig, order);
    Ok(())
}

/// Stop Loss — StopLossDecrease triggered when price moves against the position.
pub async fn stop_loss(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_long: bool,
    is_collateral_token_long: bool,
    size_delta_usd: u128,
    stop_loss_price: u128,
) -> Result<()> {
    println!(
        "Creating STOP LOSS order | {} | Size: {} | SL Price: {}",
        if is_long { "LONG" } else { "SHORT" }, size_delta_usd, stop_loss_price
    );

    let builder = client.stop_loss(
        store, market_token, is_long, size_delta_usd, stop_loss_price,
        is_collateral_token_long, 0,
    );

    let (sig, order) = send_decrease_order(client, builder, is_collateral_token_long, market_token, store).await?;
    println!("✅ Stop Loss order placed! Tx: {} | Order: {}", sig, order);
    Ok(())
}
