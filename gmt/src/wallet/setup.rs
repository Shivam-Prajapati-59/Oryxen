use gmsol_sdk::{
    client::ops::token_account::TokenAccountOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Initialize Associated Token Accounts (ATAs) for both tokens of a market.
pub async fn setup_wallet(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
) -> Result<()> {
    println!("Setting up wallet ATAs for market: {}", market_token);

    let market = client.market_by_token(store, market_token).await?;
    let long_token = market.meta.long_token_mint;
    let short_token = market.meta.short_token_mint;

    println!("  Long token:  {}", long_token);
    println!("  Short token: {}", short_token);

    // Use the canonical SPL Token program. The SDK's prepare_associated_token_account
    // internally handles idempotent ATA creation for both spl-token and token-2022 mints.
    let spl_token_program = anchor_spl::token::ID;
    let token_2022_program = anchor_spl::token_2022::ID;

    // Try SPL Token v1 first; for native SOL (WSOL) this is always correct.
    // Most GMX devnet/mainnet markets use spl-token v1.
    let mut setup_long = client.prepare_associated_token_account(&long_token, &spl_token_program, None);
    let mut setup_short = client.prepare_associated_token_account(&short_token, &spl_token_program, None);

    setup_long.try_merge(&mut setup_short)?;
    let sig = setup_long.send().await?;
    println!("✅ ATAs initialized (SPL Token v1)! Tx: {}", sig);

    // Note: if Token-2022 mints are used, call setup_wallet again for those mints
    // by swapping spl_token_program → token_2022_program above.
    let _ = token_2022_program; // suppress unused warning until Token-2022 markets are live

    Ok(())
}
