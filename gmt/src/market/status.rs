use anchor_spl::token::Mint;
use gmsol_sdk::{
    client::pyth::Hermes,
    market::MarketCalculations,
    model::{LiquidityMarketExt, MarketModel, PnlFactorKind},
    solana_utils::solana_sdk::pubkey::Pubkey,
    solana_utils::solana_sdk::signature::Keypair,
    utils::Value,
    Client,
};

/// Gets a list of names of all available markets
pub async fn get_all_market_names(client: &Client<&Keypair>, store: &Pubkey) -> gmsol_sdk::Result<Vec<String>> {
    let markets = client.markets(store).await?;
    let mut names = Vec::new();
    for (_, market) in &markets {
        if let Ok(name) = market.name() {
            names.push(name.to_string());
        }
    }
    
    names.sort();
    Ok(names)
}

/// Gives the market status by taking the input of the market name
pub async fn get_market_status_by_name(client: &Client<&Keypair>, store: &Pubkey, market_name: &str) -> gmsol_sdk::Result<()> {
    let markets = client.markets(store).await?;
    
    let mut found_market = None;
    for (_, market) in &markets {
        if let Ok(name) = market.name() {
            if name.eq_ignore_ascii_case(market_name) {
                found_market = Some(market.clone());
                break;
            }
        }
    }
    
    let market = match found_market {
        Some(m) => m,
        None => {
            println!("Market '{}' not found.", market_name);
            return Ok(());
        }
    };
    
    let mint_address = &market.meta.market_token_mint;
    let Some(mint) = client.account::<Mint>(mint_address).await? else {
        println!("Error: The token mint `{mint_address}` does not exist.");
        return Ok(());
    };

    let token_map = client.authorized_token_map(store).await?;
    let hermes = Hermes::default();
    let model = MarketModel::from_parts(market.clone(), mint.supply);
    
    let prices = match hermes.unit_prices_for_market(&token_map, &*market).await {
        Ok(p) => p,
        Err(e) => {
            println!("Error fetching prices for market '{}': {}", market_name, e);
            return Ok(());
        }
    };
    
    println!("--------------------------------------------------");
    println!("Market: {}", market_name);
    
    match model.market_token_price(&prices, PnlFactorKind::MaxAfterDeposit, true) {
        Ok(price) => {
            let market_token_price = Value::from_u128(price);
            println!("GM Price: {market_token_price} USD/GM");
        }
        Err(e) => println!("Error: Failed to calculate GM price: {}", e),
    }
    
    match model.status(&prices) {
        Ok(status) => println!("Status: {:#?}", status),
        Err(e) => println!("Error: Failed to fetch status: {}", e),
    }

    Ok(())
}
