mod market;
mod order;
mod position;
mod wallet;
mod utils;

use std::env;
use std::str::FromStr;
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
        } else if command_or_market == "create_limit_order" && args.len() > 2 {
            let market_name = &args[2];
            println!("Testing LIMIT order creation on market: {}", market_name);
            
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
                let is_collateral_token_long = true;
                let initial_collateral_amount = 500_000_000; // 0.5 SOL
                let is_long = true;
                let size_delta_usd = 1000 * 10u128.pow(30); 
                let trigger_price = 50 * 10u128.pow(30); 
                
                match order::create_limit_order(
                    &client,
                    &store,
                    &market_token,
                    is_collateral_token_long,
                    initial_collateral_amount,
                    is_long,
                    size_delta_usd,
                    trigger_price
                ).await {
                    Ok(_) => println!("Limit Order request finished successfully!"),
                    Err(e) => {
                        println!("Failed to create limit order.");
                        println!("Error Details: {:?}", e);
                        if let Some(source) = std::error::Error::source(&e) {
                            println!("Source Error: {:?}", source);
                        }
                    }
                }
            } else {
                println!("Market '{}' not found.", market_name);
            }
        } else if command_or_market == "update_order" {
            if args.len() < 5 {
                println!("Usage: cargo run update_order <market_name> <order_address> <new_price>");
                return Ok(());
            }
            let market_name = &args[2];
            let order_address_str = &args[3];
            let new_price_str = &args[4];
            
            println!("Updating order {} on market {} to price {}", order_address_str, market_name, new_price_str);

            let order_address = gmsol_sdk::solana_utils::solana_sdk::pubkey::Pubkey::from_str(order_address_str)
                .map_err(|e| gmsol_sdk::Error::custom(format!("Invalid order address: {}", e)))?;
                
            let new_trigger_price = u128::from_str(new_price_str)
                .map_err(|e| gmsol_sdk::Error::custom(format!("Invalid price: {}", e)))?;
                
            // Resolve market token
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
                match order::update_order(
                    &client,
                    &store,
                    &market_token,
                    &order_address,
                    new_trigger_price
                ).await {
                    Ok(_) => println!("Order updated successfully!"),
                    Err(e) => {
                        println!("Failed to update order.");
                        println!("Error: {:?}", e);
                    }
                }
            } else {
                println!("Market '{}' not found.", market_name);
            }
        } else if command_or_market == "close_order" && args.len() > 2 {
            // Close an existing order by address
            let order_address_str = &args[2];
            println!("Attempting to close order: {}", order_address_str);

            let order_address = gmsol_sdk::solana_utils::solana_sdk::pubkey::Pubkey::from_str(order_address_str)
                .map_err(|e| gmsol_sdk::Error::custom(format!("Invalid order address: {}", e)))?;

            match order::close_order(&client, &order_address).await {
                Ok(_) => println!("Order request finished successfully!"),
                Err(e) => {
                    println!("Failed to close order.");
                    println!("Error Details: {:?}", e);
                    if let Some(source) = std::error::Error::source(&e) {
                        println!("Source Error: {:?}", source);
                    }
                }
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
        println!("       cargo run close_order <order_address>");
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