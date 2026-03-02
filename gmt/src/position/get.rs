use gmsol_sdk::{
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

/// Safe truncate: takes at most `max_len` chars (no byte-boundary panic).
fn truncate(s: &str, max_len: usize) -> String {
    s.chars().take(max_len).collect()
}

/// List all open positions for the current wallet.
pub async fn list_positions(
    client: &Client<&Keypair>,
    store: &Pubkey,
) -> Result<()> {
    let payer = client.payer();
    println!("Fetching open positions for wallet: {}", payer);

    let positions = client.positions(store, Some(&payer), None).await?;

    if positions.is_empty() {
        println!("No open positions found.");
        return Ok(());
    }

    println!("\n{:=<72}", "");
    println!("{:<5} {:<44} {:<10}", "#", "Address", "Side");
    println!("{:=<72}", "");

    for (i, (addr, position)) in positions.iter().enumerate() {
        let side = match position.kind {
            1 => "LONG",
            2 => "SHORT",
            _ => "UNKNOWN",
        };
        println!(
            "{:<5} {:<44} {:<10}",
            i + 1,
            truncate(&addr.to_string(), 44),
            side,
        );
    }
    println!("{:=<72}", "");
    println!("Total positions: {}", positions.len());

    Ok(())
}

/// Fetch and display details of a specific position by its on-chain address.
pub async fn get_position(
    client: &Client<&Keypair>,
    position_address: &Pubkey,
) -> Result<()> {
    println!("Fetching position: {}\n", position_address);

    match client.position(position_address).await {
        Ok(position) => {
            let side = match position.kind {
                1 => "LONG",
                2 => "SHORT",
                _ => "UNKNOWN",
            };

            println!("┌─────────────────────────────────────────────────────────┐");
            println!("│  Position Details                                       │");
            println!("├─────────────────────────────────────────────────────────┤");
            println!("│  Address      : {}", position_address);
            println!("│  Store        : {}", position.store);
            println!("│  Owner        : {}", position.owner);
            println!("│  Market Token : {}", position.market_token);
            println!("│  Side         : {}", side);
            println!("│  Kind         : {}", position.kind);
            println!("│  Version      : {}", position.version);
            println!("│  Bump         : {}", position.bump);
            println!("└─────────────────────────────────────────────────────────┘");

            println!("\n📋 Full position data:");
            println!("{:#?}", position);
        }
        Err(e) => {
            eprintln!("❌ Position not found (may have been closed/liquidated)");
            eprintln!("   Address: {}", position_address);
            eprintln!("   Error:   {:?}", e);
        }
    }

    Ok(())
}

/// Fetch and display details of a specific order by its on-chain address.
/// Note: On Devnet, keepers process orders fast — the order may already be gone.
pub async fn get_order(
    client: &Client<&Keypair>,
    order_address: &Pubkey,
) -> Result<()> {
    println!("Fetching order: {}\n", order_address);

    match client.order(order_address).await {
        Ok(order) => {
            println!("┌─────────────────────────────────────────────────────────┐");
            println!("│  Order Details                                          │");
            println!("├─────────────────────────────────────────────────────────┤");
            println!("│  Address : {}", order_address);
            println!("└─────────────────────────────────────────────────────────┘");
            println!("\n📋 Full order data:");
            println!("{:#?}", order);
        }
        Err(e) => {
            eprintln!("❌ Order not found (may have been executed/cancelled by keepers)");
            eprintln!("   Address: {}", order_address);
            eprintln!("   Error:   {:?}", e);
        }
    }

    Ok(())
}
