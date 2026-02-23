use gmsol_sdk::{
    client::ops::{exchange::ExchangeOps, token_account::TokenAccountOps},
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Setup associated token accounts for the market.
/// This initializes the ATAs for both the short (base) token and long (quote) token 
/// on the Devnet wallet, so `NotFound` errors don't trigger.
pub async fn setup_associated_token_accounts(
    client: &Client<&Keypair>,
    store: &Pubkey,
    market_token: &Pubkey,
) -> Result<()> {
    // We need to fetch the market configuration to know the underlyings.
    // market_token is the MINT address, so use market_by_token to derive the PDA.
    let market = client.market_by_token(store, market_token).await?;
    let market_meta = &market.meta;

    let long_token_mint = market_meta.long_token_mint;
    let short_token_mint = market_meta.short_token_mint;

    println!("Initializing ATAs for:");
    println!("- Long Token: {}", long_token_mint);
    println!("- Short Token: {}", short_token_mint);

    // Get instructions to create idempotent associated token accounts for these mints
    let token_program_id = anchor_spl::token::ID; // Classic SPL Token Program
    
    let mut setup_long_txn_builder = client.prepare_associated_token_account(&long_token_mint, &token_program_id, None);
    let mut setup_short_txn_builder = client.prepare_associated_token_account(&short_token_mint, &token_program_id, None);

    // Send transactions explicitly. 
    // They are idempotent, meaning if the ATA is already formed, it will safely skip.
    setup_long_txn_builder.try_merge(&mut setup_short_txn_builder)?;
    let sig = setup_long_txn_builder.send().await?;

    println!("ATAs Successfully initialized! Transaction Signature: {}", sig);
    
    Ok(())
}

/// Create an order by the owner.
/// The `gmsol-sdk` builders automatically handle the `prepare_position` instruction internally
/// if the position PDA has not been initialized yet.
pub async fn create_order(
    client: &Client<&Keypair>, 
    store: &Pubkey, 
    market_token: &Pubkey,
    is_collateral_token_long: bool,
    initial_collateral_amount: u64,
    is_long: bool,
    size_delta_usd: u128,
) -> Result<()> {

    // Fetch the market to know its underlying token mints
    // market_token is the MINT address, so use market_by_token to derive the PDA.
    let derived_market_pda = client.find_market_address(store, market_token);
    println!("Store Address: {}", store);
    println!("Market Token Mint: {}", market_token);
    println!("Derived Market PDA: {}", derived_market_pda);
    
    let market = match client.market_by_token(store, market_token).await {
        Ok(m) => m,
        Err(e) => {
            println!("market_by_token() failed: {:?}", e);
            return Err(e);
        }
    };
    let market_meta = &market.meta;
    let long_token_mint = market_meta.long_token_mint;
    let short_token_mint = market_meta.short_token_mint;

    let initial_collateral_mint = if is_collateral_token_long {
        long_token_mint
    } else {
        short_token_mint
    };

    let user_pubkey = client.payer();
    let long_token_ata = anchor_spl::associated_token::get_associated_token_address(&user_pubkey, &long_token_mint);
    let short_token_ata = anchor_spl::associated_token::get_associated_token_address(&user_pubkey, &short_token_mint);

    println!("Attempting order creation for user: {}", user_pubkey);
    println!("- Long Token Mint: {} | ATA: {}", long_token_mint, long_token_ata);
    println!("- Short Token Mint: {} | ATA: {}", short_token_mint, short_token_ata);
    println!("- Initial Collateral Mint Set: {}", initial_collateral_mint);

    let mut builder = client.market_increase(
        store,
        market_token,
        is_collateral_token_long,
        initial_collateral_amount,
        is_long,
        size_delta_usd,
    );
    
    // Explicitly set the initial collateral token AND ITS ACCOUNT to bypass the dynamically failing ATA lookup
    let user_valid_ata = if is_collateral_token_long { long_token_ata } else { short_token_ata };
    builder.initial_collateral_token(&initial_collateral_mint, Some(&user_valid_ata));

    let (txn_builder, order_address) = match builder.build_with_address().await {
        Ok(res) => res,
        Err(e) => {
            println!("Failed during build_with_address(): {:?}", e);
            return Err(e);
        }
    };
    
    let builder_sig = match txn_builder.send().await {
        Ok(sig) => sig,
        Err(e) => {
            println!("Failed during send(): {:?}", e);
            return Err(e.into());
        }
    };
    
    println!("Successfully built and executed create_order: {}", builder_sig);
    println!("Order Address: {}", order_address);
        
    Ok(())
}
