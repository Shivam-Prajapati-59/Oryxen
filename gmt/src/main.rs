use gmsol_sdk::{
    Client,
    solana_utils::{
        cluster::Cluster,
        solana_sdk::{pubkey::Pubkey, signature::read_keypair_file},
    },
};
use anyhow::Result;
use dotenv::dotenv;
use std::env;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    // Load environment variables
    let keypair_path = env::var("KEYPAIR").expect("KEYPAIR must be set");
    let market_token_str = env::var("MARKET_TOKEN").expect("MARKET_TOKEN must be set");
    let rpc_url = env::var("RPC_URL").unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string());

    // Initialize keypair and market token
    let keypair = read_keypair_file(&keypair_path).expect("Failed to read keypair file");
    let market_token: Pubkey = market_token_str.parse().expect("Invalid MARKET_TOKEN format");

    println!("Initializing GMX Solana Client...");
    println!("RPC URL: {}", rpc_url);
    println!("Market Token: {}", market_token);

    // Initialize client
    let client = Client::new(Cluster::Custom(rpc_url.clone(), rpc_url.replace("https", "wss")), &keypair)
        .expect("Failed to create client");

    // Example interaction: Find store address (empty string implies finding default store)
    // Note: The specific logic depends on what store/market we are interacting with.
    // The README example uses an empty string for find_store_address, let's try that.
    let store = client.find_store_address("");
    println!("Store Address: {}", store);
    // Retrieve all available markets.
    let markets = client.markets(&store);
    println!("Loaded {} markets.", markets.len());

    // Example: Print market token balance or other info if available in SDK
    // For now, just confirming client initialization
    println!("Client initialized successfully.");

    Ok(())
}
