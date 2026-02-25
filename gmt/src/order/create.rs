use gmsol_sdk::{
    client::ops::{exchange::ExchangeOps, token_account::TokenAccountOps},
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    solana_utils::solana_sdk::instruction::Instruction,
    solana_utils::solana_sdk::system_instruction,
    Client, Result,
};

/// Native SOL mint address (WSOL).
const NATIVE_SOL_MINT: Pubkey = anchor_spl::token::spl_token::native_mint::ID;

/// Initializes ATAs for a market's long and short tokens (idempotent).
pub async fn setup_associated_token_accounts(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
) -> Result<()> {
    let market = client.market_by_token(store, market_token).await?;
    let long_token_mint = market.meta.long_token_mint;
    let short_token_mint = market.meta.short_token_mint;
    let token_program_id = anchor_spl::token::ID;

    let mut setup_long = client.prepare_associated_token_account(&long_token_mint, &token_program_id, None);
    let mut setup_short = client.prepare_associated_token_account(&short_token_mint, &token_program_id, None);

    setup_long.try_merge(&mut setup_short)?;
    let sig = setup_long.send().await?;

    println!("ATAs initialized! Tx: {}", sig);
    Ok(())
}

/// Creates a market-increase order. If collateral is native SOL, wraps it atomically
/// within the same transaction — if any step fails, everything rolls back.
pub async fn create_order(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_collateral_token_long: bool,
    initial_collateral_amount: u64,
    is_long: bool,
    size_delta_usd: u128,
) -> Result<()> {
    // Resolve market tokens
    let market = client.market_by_token(store, market_token).await?;
    let long_token_mint = market.meta.long_token_mint;
    let short_token_mint = market.meta.short_token_mint;

    let initial_collateral_mint = if is_collateral_token_long { long_token_mint } else { short_token_mint };

    // Derive user ATAs
    let user = client.payer();
    let long_ata = anchor_spl::associated_token::get_associated_token_address(&user, &long_token_mint);
    let short_ata = anchor_spl::associated_token::get_associated_token_address(&user, &short_token_mint);
    let collateral_ata = if is_collateral_token_long { long_ata } else { short_ata };

    println!("Creating {} order | Collateral: {} | Amount: {} lamports",
        if is_long { "LONG" } else { "SHORT" }, initial_collateral_mint, initial_collateral_amount);

    // Prepare SOL wrap instructions if collateral is native SOL
    let mut wrap_instructions: Vec<Instruction> = Vec::new();
    if initial_collateral_mint == NATIVE_SOL_MINT {
        println!("Auto-wrapping native SOL → WSOL...");
        wrap_instructions.push(system_instruction::transfer(&user, &collateral_ata, initial_collateral_amount));
        wrap_instructions.push(
            anchor_spl::token::spl_token::instruction::sync_native(&anchor_spl::token::ID, &collateral_ata)
                .map_err(|e| gmsol_sdk::Error::custom(format!("sync_native error: {}", e)))?
        );
    }

    // Build the order transaction
    let mut builder = client.market_increase(store, market_token, is_collateral_token_long, initial_collateral_amount, is_long, size_delta_usd);
    builder.initial_collateral_token(&initial_collateral_mint, Some(&collateral_ata));

    let (txn_builder, order_address) = builder.build_with_address().await?;

    // Prepend wrap instructions for atomic execution
    let txn_builder = if !wrap_instructions.is_empty() {
        txn_builder.pre_instructions(wrap_instructions, false)
    } else {
        txn_builder
    };

    // Send — if anything fails, entire transaction (including wrap) rolls back
    let sig = txn_builder.send().await?;

    println!("✅ Order created! Tx: {} | Order: {}", sig, order_address);
    Ok(())
}

/// Creates a limit-increase order.
pub async fn create_limit_order(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
    is_collateral_token_long: bool,
    initial_collateral_amount: u64,
    is_long: bool,
    size_delta_usd: u128,
    trigger_price: u128,
) -> Result<()> {
    // Resolve market tokens
    let market = client.market_by_token(store, market_token).await?;
    let long_token_mint = market.meta.long_token_mint;
    let short_token_mint = market.meta.short_token_mint;

    let initial_collateral_mint = if is_collateral_token_long { long_token_mint } else { short_token_mint };

    // Derive user ATAs
    let user = client.payer();
    let long_ata = anchor_spl::associated_token::get_associated_token_address(&user, &long_token_mint);
    let short_ata = anchor_spl::associated_token::get_associated_token_address(&user, &short_token_mint);
    let collateral_ata = if is_collateral_token_long { long_ata } else { short_ata };

    println!("Creating LIMIT {} order | Collateral: {} | Amount: {} | Trigger Price: {}",
        if is_long { "LONG" } else { "SHORT" }, initial_collateral_mint, initial_collateral_amount, trigger_price);

    // Prepare SOL wrap instructions if collateral is native SOL
    let mut wrap_instructions: Vec<Instruction> = Vec::new();
    if initial_collateral_mint == NATIVE_SOL_MINT {
        println!("Auto-wrapping native SOL → WSOL...");
        wrap_instructions.push(system_instruction::transfer(&user, &collateral_ata, initial_collateral_amount));
        wrap_instructions.push(
            anchor_spl::token::spl_token::instruction::sync_native(&anchor_spl::token::ID, &collateral_ata)
                .map_err(|e| gmsol_sdk::Error::custom(format!("sync_native error: {}", e)))?
        );
    }

    // Build the LIMIT order transaction
    let mut builder = client.limit_increase(
        store,
        market_token,
        is_long,
        size_delta_usd,
        trigger_price,
        is_collateral_token_long,
        initial_collateral_amount,
    );
    builder.initial_collateral_token(&initial_collateral_mint, Some(&collateral_ata));

    let (txn_builder, order_address) = builder.build_with_address().await?;

    // Prepend wrap instructions
    let txn_builder = if !wrap_instructions.is_empty() {
        txn_builder.pre_instructions(wrap_instructions, false)
    } else {
        txn_builder
    };

    let sig = txn_builder.send().await?;

    println!("✅ Limit Order created! Tx: {} | Order: {}", sig, order_address);
    Ok(())
}
