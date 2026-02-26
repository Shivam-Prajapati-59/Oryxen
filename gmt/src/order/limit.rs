use gmsol_sdk::{
    client::ops::exchange::ExchangeOps,
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    solana_utils::solana_sdk::instruction::Instruction,
    solana_utils::solana_sdk::system_instruction,
    Client, Result,
};

const NATIVE_SOL_MINT: Pubkey = anchor_spl::token::spl_token::native_mint::ID;

async fn build_order_with_sol_wrap(
    client: &Client<&Keypair>,
    mut builder: gmsol_sdk::ops::exchange::order::CreateOrderBuilder<'_, &Keypair>,
    collateral_mint: &Pubkey,
    collateral_ata: &Pubkey,
    collateral_amount: u64,
) -> Result<(String, Pubkey)> {
    let user = client.payer();
    let mut wrap_instructions: Vec<Instruction> = Vec::new();
    if collateral_mint == &NATIVE_SOL_MINT {
        println!("Auto-wrapping native SOL → WSOL...");
        wrap_instructions.push(system_instruction::transfer(&user, collateral_ata, collateral_amount));
        wrap_instructions.push(
            anchor_spl::token::spl_token::instruction::sync_native(&anchor_spl::token::ID, collateral_ata)
                .map_err(|e| gmsol_sdk::Error::custom(format!("sync_native error: {}", e)))?,
        );
    }

    builder.initial_collateral_token(collateral_mint, Some(collateral_ata));
    let (txn_builder, order_address) = builder.build_with_address().await?;
    let txn_builder = if !wrap_instructions.is_empty() {
        txn_builder.pre_instructions(wrap_instructions, false)
    } else {
        txn_builder
    };
    let sig = txn_builder.send().await?;
    Ok((sig.to_string(), order_address))
}

/// Limit Increase (open a position at a specified trigger price).
pub async fn open_limit_order(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_long: bool,
    is_collateral_token_long: bool,
    initial_collateral_amount: u64,
    size_delta_usd: u128,
    trigger_price: u128,
) -> Result<()> {
    println!(
        "Creating LIMIT {} order | Size: {} | Trigger: {}",
        if is_long { "LONG" } else { "SHORT" }, size_delta_usd, trigger_price
    );

    let market = client.market_by_token(store, market_token).await?;
    let collateral_mint = if is_collateral_token_long { market.meta.long_token_mint } else { market.meta.short_token_mint };
    let collateral_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), &collateral_mint);

    let builder = client.limit_increase(
        store, market_token, is_long, size_delta_usd, trigger_price,
        is_collateral_token_long, initial_collateral_amount,
    );

    let (sig, order) = build_order_with_sol_wrap(client, builder, &collateral_mint, &collateral_ata, initial_collateral_amount).await?;
    println!("✅ Limit Order placed! Tx: {} | Order: {}", sig, order);
    Ok(())
}

/// Limit Decrease (close/reduce a position at a trigger price).
pub async fn close_limit_order(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_long: bool,
    is_collateral_token_long: bool,
    size_delta_usd: u128,
    trigger_price: u128,
    collateral_withdrawal_amount: u64,
) -> Result<()> {
    println!(
        "Creating LIMIT DECREASE {} order | Size: {} | Trigger: {}",
        if is_long { "LONG" } else { "SHORT" }, size_delta_usd, trigger_price
    );

    let market = client.market_by_token(store, market_token).await?;
    let collateral_mint = if is_collateral_token_long { market.meta.long_token_mint } else { market.meta.short_token_mint };
    let collateral_ata = anchor_spl::associated_token::get_associated_token_address(&client.payer(), &collateral_mint);

    let builder = client.limit_decrease(
        store, market_token, is_long, size_delta_usd, trigger_price,
        is_collateral_token_long, collateral_withdrawal_amount,
    );

    let (sig, order) = build_order_with_sol_wrap(client, builder, &collateral_mint, &collateral_ata, 0).await?;
    println!("✅ Limit Decrease Order placed! Tx: {} | Order: {}", sig, order);
    Ok(())
}
