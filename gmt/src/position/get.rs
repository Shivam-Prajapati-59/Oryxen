use gmsol_sdk::{
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    Client, Result,
};

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
    println!("{:<5} {:<20} {:<10} {:>20} {:>15}", "#", "Address", "Side", "Size (raw)", "Collateral");
    println!("{:=<72}", "");

    for (i, (addr, position)) in positions.iter().enumerate() {
        // Position kind: 1 = Long, 2 = Short (from gmsol_store IDL)
        let side = match position.kind {
            1 => "LONG",
            2 => "SHORT",
            _ => "UNKNOWN",
        };
        println!(
            "{:<5} {:<20} {:<10} {:>20} {:>15}",
            i + 1,
            &addr.to_string()[..20],
            side,
            "—",   // size_in_usd requires model decode
            "—",   // collateral_amount requires model decode
        );
    }
    println!("{:=<72}", "");
    println!("Total positions: {}", positions.len());
    println!("(Use 'solana account <addr> -u d' to inspect raw account data)");

    Ok(())
}
