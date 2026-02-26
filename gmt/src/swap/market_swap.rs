use gmsol_sdk::{
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Market Swap — swap tokens at current market price.
pub async fn market_swap(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_output_token_long: bool,
    swap_in_token: &Pubkey,
    swap_in_amount: u64,
    swap_path: Vec<Pubkey>,
) -> Result<()> {
    println!(
        "Market Swap | In: {} | Amount: {} | Output long token: {}",
        swap_in_token, swap_in_amount, is_output_token_long
    );

    let swap_in_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), swap_in_token);

    let mut builder = client.market_swap(
        store, market_token, is_output_token_long,
        swap_in_token, swap_in_amount, swap_path.iter(),
    );
    builder.initial_collateral_token(swap_in_token, Some(&swap_in_ata));

    let (txn_builder, order_address) = builder.build_with_address().await?;
    let sig = txn_builder.send().await?;
    println!("✅ Swap executed! Tx: {} | Order: {}", sig, order_address);
    Ok(())
}

/// Limit Swap — swap tokens when minimum output amount is met.
pub async fn limit_swap(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_output_token_long: bool,
    min_output_amount: u64,
    swap_in_token: &Pubkey,
    swap_in_amount: u64,
    swap_path: Vec<Pubkey>,
) -> Result<()> {
    println!(
        "Limit Swap | In: {} | Amount: {} | Min output: {}",
        swap_in_token, swap_in_amount, min_output_amount
    );

    let swap_in_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), swap_in_token);

    let mut builder = client.limit_swap(
        store, market_token, is_output_token_long, min_output_amount,
        swap_in_token, swap_in_amount, swap_path.iter(),
    );
    builder.initial_collateral_token(swap_in_token, Some(&swap_in_ata));

    let (txn_builder, order_address) = builder.build_with_address().await?;
    let sig = txn_builder.send().await?;
    println!("✅ Limit Swap placed! Tx: {} | Order: {}", sig, order_address);
    Ok(())
}
