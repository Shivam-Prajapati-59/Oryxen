use gmsol_sdk::{
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Deposit collateral — `market_increase` with zero size, just adds collateral.
pub async fn deposit_collateral(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_long: bool,
    is_collateral_token_long: bool,
    collateral_amount: u64,
) -> Result<()> {
    println!(
        "Depositing {} lamports collateral into {} position",
        collateral_amount, if is_long { "LONG" } else { "SHORT" }
    );

    let market = client.market_by_token(store, market_token).await?;
    let collateral_mint = if is_collateral_token_long { market.meta.long_token_mint } else { market.meta.short_token_mint };
    let collateral_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), &collateral_mint);

    let mut builder = client.market_increase(store, market_token, is_collateral_token_long, collateral_amount, is_long, 0);
    builder.initial_collateral_token(&collateral_mint, Some(&collateral_ata));

    let (txn_builder, order_address) = builder.build_with_address().await?;
    let sig = txn_builder.send().await?;
    println!("✅ Collateral deposited! Tx: {} | Order: {}", sig, order_address);
    Ok(())
}

/// Withdraw collateral — `market_decrease` with zero size, just removes collateral.
pub async fn withdraw_collateral(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_long: bool,
    is_collateral_token_long: bool,
    collateral_withdrawal_amount: u64,
) -> Result<()> {
    println!(
        "Withdrawing {} lamports collateral from {} position",
        collateral_withdrawal_amount, if is_long { "LONG" } else { "SHORT" }
    );

    let market = client.market_by_token(store, market_token).await?;
    let collateral_mint = if is_collateral_token_long { market.meta.long_token_mint } else { market.meta.short_token_mint };
    let collateral_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), &collateral_mint);

    let mut builder = client.market_decrease(store, market_token, is_collateral_token_long, collateral_withdrawal_amount, is_long, 0);
    builder.initial_collateral_token(&collateral_mint, Some(&collateral_ata));

    let (txn_builder, order_address) = builder.build_with_address().await?;
    let sig = txn_builder.send().await?;
    println!("✅ Collateral withdrawn! Tx: {} | Order: {}", sig, order_address);
    Ok(())
}
