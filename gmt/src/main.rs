mod market;
mod order;
mod position;
mod wallet;
mod utils;

use std::env;
use gmsol_sdk::{
    solana_utils::solana_sdk::signature::{Keypair, Signer},
    Client,
};

#[tokio::main]
async fn main() -> gmsol_sdk::Result<()> {
    use tracing_subscriber::{fmt::format::FmtSpan, EnvFilter};

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::from_default_env()
                .add_directive("market=info".parse().map_err(gmsol_sdk::Error::custom)?),
        )
        .with_span_events(FmtSpan::FULL)
        .init();

    let cluster = env::var("CLUSTER")
        .unwrap_or_else(|_| "devnet".to_string())
        .parse()?;
    
    // Manage local test keypair
    let keypair_path = "test_payer.json";
    let payer = if std::path::Path::new(keypair_path).exists() {
        gmsol_sdk::solana_utils::solana_sdk::signature::read_keypair_file(keypair_path)
            .expect("Failed to read test_payer.json")
    } else {
        let new_payer = Keypair::new();
        gmsol_sdk::solana_utils::solana_sdk::signature::write_keypair_file(&new_payer, keypair_path)
            .expect("Failed to write to test_payer.json");
        new_payer
    };

    println!("--------------------------------------------------");
    println!("Wallet Public Key: {}", payer.pubkey());
    println!("Please ensure this wallet has DEVNET SOL and USDC/WSOL.");
    println!("--------------------------------------------------");

    let client = Client::new(cluster, &payer)?;

    // Passing an empty string returns the default store address.
    let store = client.find_store_address("");

    let args: Vec<String> = env::args().collect();

    if args.len() > 1 {
        let command_or_market = &args[1];
        
        if command_or_market == "create_order" && args.len() > 2 {
            let market_name = &args[2];
            println!("Testing order creation on market: {}", market_name);
            
            // Look up the market to find its market_token MINT address
            // IMPORTANT: client.markets() keys are market PDA addresses, NOT token mints.
            let markets = client.markets(&store).await?;
            let mut found_market_token = None;
            for (_pda_key, market) in &markets {
                if let Ok(name) = market.name() {
                    if name.eq_ignore_ascii_case(market_name) {
                        found_market_token = Some(market.meta.market_token_mint);
                        break;
                    }
                }
            }
            
            if let Some(market_token) = found_market_token {
                // Here we pass dummy values that would be populated by your logic/UI
                let is_collateral_token_long = true; // usually true for the base token
                let initial_collateral_amount = 10_000_000; // e.g. 10 USDC (assuming 6 decimals)
                let is_long = true;
                let size_delta_usd = 50_000_000; // e.g. $50 worth of size
                
                // Attempt to execute creation 
                // Note: this will fail with 'insufficient funds' if the payer wallet is empty
                match order::create_order(
                    &client,
                    &store,
                    &market_token,
                    is_collateral_token_long,
                    initial_collateral_amount,
                    is_long,
                    size_delta_usd
                ).await {
                    Ok(_) => println!("Order request finished successfully!"),
                    Err(e) => {
                        println!("Failed to create order.");
                        println!("Error Details: {:?}", e);
                        println!("Full Error: {:#?}", e);
                        if let Some(source) = std::error::Error::source(&e) {
                            println!("Source Error: {:?}", source);
                        }
                    }
                }
            } else {
                println!("Market '{}' not found. Cannot create order.", market_name);
            }
        } else if command_or_market == "setup_wallet" && args.len() > 2 {
            let market_name = &args[2];
            println!("Setting up wallet token accounts for market: {}", market_name);
            
            let markets = client.markets(&store).await?;
            let mut found_market_token = None;
            for (_pda_key, market) in &markets {
                if let Ok(name) = market.name() {
                    if name.eq_ignore_ascii_case(market_name) {
                        found_market_token = Some(market.meta.market_token_mint);
                        break;
                    }
                }
            }
            
            if let Some(market_token) = found_market_token {
                // Setup ATAs for this market
                match order::setup_associated_token_accounts(&client, &store, &market_token).await {
                    Ok(_) => println!("Wallet ATAs setup completed!"),
                    Err(e) => {
                        println!("Failed to setup wallet accounts.");
                        println!("Error Details: {:?}", e);
                    }
                }
            } else {
                println!("Market '{}' not found. Cannot setup wallet accounts.", market_name);
            }
        } else {
            // Find specific market status (Fallback to old behavior)
            let market_name = command_or_market;
            market::get_market_status_by_name(&client, &store, market_name).await?;
        }
    } else {
        // Fetch all markets
        println!("Usage: cargo run <market_name>");
        println!("       cargo run create_order <market_name>");
        println!("Example: cargo run \"SOL/USD[WSOL-USDC]\"\n");
        
        println!("Fetching all available markets...");
        let market_names = market::get_all_market_names(&client, &store).await?;
        
        println!("Available Markets ({} total):", market_names.len());
        for name in &market_names {
            println!("- {}", name);
        }
    }

    Ok(())
}