use gmsol_sdk::{
    client::ops::token_account::TokenAccountOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Initialize Associated Token Accounts (ATAs) for both tokens of a market.
/// Call this once per wallet/market pair before trading.
pub async fn setup_wallet(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
) -> Result<()> {
    println!("Setting up wallet ATAs for market: {}", market_token);

    let market = client.market_by_token(store, market_token).await?;
    let long_token = market.meta.long_token_mint;
    let short_token = market.meta.short_token_mint;
    let token_program_id = anchor_spl::token::ID;

    println!("  Long token:  {}", long_token);
    println!("  Short token: {}", short_token);

    let mut setup_long = client.prepare_associated_token_account(&long_token, &token_program_id, None);
    let mut setup_short = client.prepare_associated_token_account(&short_token, &token_program_id, None);

    setup_long.try_merge(&mut setup_short)?;
    let sig = setup_long.send().await?;
    println!("✅ ATAs initialized! Tx: {}", sig);
    Ok(())
}
