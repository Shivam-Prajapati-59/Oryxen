mod market;
mod order;
mod position;
mod swap;
mod wallet;
mod utils;

use std::env;
use std::str::FromStr;
use gmsol_sdk::{
    solana_utils::solana_sdk::signature::{Keypair, Signer},
    Client,
};

// ─── Price Precision Constants ─────────────────────────────────────────────
// MARKET_USD_UNIT = 10^20  (all USD size values use this scale)
// Token price precision: price * 10^(30 - token_decimals)
//   SOL (9 dec)  → price * 10^21   e.g. $150 SOL = 150 * 10^21
//   USDC (6 dec) → price * 10^24   e.g. $1 USDC   = 1  * 10^24
const MARKET_USD_UNIT: u128 = 10u128.pow(20);
const SOL_PRICE_UNIT: u128 = 10u128.pow(21); // 10^(30-9)

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

    // ─── Network selection via ENV ────────────────────────────────────────────
    // Set NETWORK=devnet (default) or NETWORK=mainnet-beta in shell or .env
    // Example: NETWORK=mainnet-beta cargo run list_markets
    let network = env::var("NETWORK")
        .or_else(|_| env::var("CLUSTER")) // backward-compat
        .unwrap_or_else(|_| "devnet".to_string());

    let cluster = network.parse()?;

    // Keypair path can also be overridden per-network
    let keypair_path = env::var("KEYPAIR").unwrap_or_else(|_| "test_payer.json".to_string());
    let payer = if std::path::Path::new(&keypair_path).exists() {
        gmsol_sdk::solana_utils::solana_sdk::signature::read_keypair_file(&keypair_path)
            .expect("Failed to read keypair file")
    } else {
        let new_payer = Keypair::new();
        gmsol_sdk::solana_utils::solana_sdk::signature::write_keypair_file(&new_payer, &keypair_path)
            .expect("Failed to write keypair file");
        println!("⚠️  New keypair created: {}", keypair_path);
        new_payer
    };

    let network_label = match network.as_str() {
        "mainnet-beta" | "mainnet" => "🔴 MAINNET",
        "devnet"                   => "🟡 DEVNET",
        "localnet" | "localhost"   => "⚪ LOCALNET",
        _                          => "🟡 DEVNET",
    };

    println!("┌─────────────────────────────────────────┐");
    println!("│  Network : {:31}│", network_label);
    println!("│  Wallet  : {:31}│", &payer.pubkey().to_string()[..31]);
    println!("│  Keypair : {:31}│", keypair_path);
    println!("└─────────────────────────────────────────┘");

    let client = Client::new(cluster, &payer)?;
    let store = client.find_store_address("");
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        print_usage();
        return Ok(());
    }

    let cmd = &args[1];

    // ─── Helper macro: resolve market_token mint from market name ─────────────
    // Uses a macro instead of a closure/function to avoid needing the explicit
    // Market type path which is not directly re-exported in gmsol_sdk.
    macro_rules! resolve_market {
        ($name:expr, $markets:expr) => {{
            let mut found: Option<gmsol_sdk::solana_utils::solana_sdk::pubkey::Pubkey> = None;
            for (_, m) in $markets.iter() {
                if let Ok(n) = m.name() {
                    if n.eq_ignore_ascii_case($name) {
                        found = Some(m.meta.market_token_mint);
                        break;
                    }
                }
            }
            found
        }};
    }

    match cmd.as_str() {

        // ── LIST COMMANDS ───────────────────────────────────────────────────

        "list_markets" => {
            let markets = client.markets(&store).await?;
            println!("\n{:=<60}", "");
            println!("{:<40} {:<20}", "Market Name", "Token Mint");
            println!("{:=<60}", "");
            for (_, m) in &markets {
                if let Ok(name) = m.name() {
                    println!("{:<40} {}", name, &m.meta.market_token_mint.to_string()[..12]);
                }
            }
            println!("{:=<60}", "");
        }

        "list_positions" => {
            position::list_positions(&client, &store).await?;
        }

        // ── OPEN POSITION (MARKET) ──────────────────────────────────────────
        // Usage: open_long <market_name> <collateral_lamports> <size_usd_whole>
        // Example: cargo run open_long "SOL/USD[WSOL-USDC]" 500000000 1000
        "open_long" | "open_short" => {
            if args.len() < 5 {
                println!("Usage: {} <market_name> <collateral_lamports> <size_usd_whole>", cmd);
                println!("  size_usd_whole: e.g. 1000 means $1000 of position size");
                return Ok(());
            }
            let market_name = &args[2];
            let collateral: u64 = args[3].parse().map_err(|e| gmsol_sdk::Error::custom(format!("Invalid collateral: {}", e)))?;
            let size_usd_whole: u128 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("Invalid size: {}", e)))?;

            let is_long = cmd == "open_long";
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            order::create_order(&client, &store, &market_token, true, collateral, is_long, size_usd_whole * MARKET_USD_UNIT).await?;
        }

        // ── OPEN POSITION (LIMIT) ───────────────────────────────────────────
        // Usage: open_limit <market_name> long|short <collateral_lamports> <size_usd_whole> <trigger_price_usd>
        // Example: cargo run open_limit "SOL/USD[WSOL-USDC]" long 500000000 1000 120
        "open_limit" => {
            if args.len() < 7 {
                println!("Usage: open_limit <market_name> <long|short> <collateral_lamports> <size_usd_whole> <trigger_price_usd>");
                println!("  trigger_price_usd: e.g. 120 means trigger when SOL = $120");
                return Ok(());
            }
            let market_name = &args[2];
            let side = &args[3];
            let collateral: u64 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad collateral: {}", e)))?;
            let size_usd_whole: u128 = args[5].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad size: {}", e)))?;
            let trigger_usd: u128 = args[6].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad price: {}", e)))?;

            let is_long = side.eq_ignore_ascii_case("long");
            let trigger_price = trigger_usd * SOL_PRICE_UNIT;
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            order::open_limit_order(&client, &store, &market_token, is_long, true, collateral, size_usd_whole * MARKET_USD_UNIT, trigger_price).await?;
        }

        // ── CLOSE POSITION (MARKET) ─────────────────────────────────────────
        // Usage: close_position <market_name> <long|short> <size_usd_whole>
        // Example: cargo run close_position "SOL/USD[WSOL-USDC]" long 1000
        // Use 0 for size_usd_whole to close fully (protocol will use max size).
        "close_position" => {
            if args.len() < 5 {
                println!("Usage: close_position <market_name> <long|short> <size_usd_whole>");
                println!("  size_usd_whole = 0 to close the entire position");
                return Ok(());
            }
            let market_name = &args[2];
            let side = &args[3];
            let size_whole: u128 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad size: {}", e)))?;

            let is_long = side.eq_ignore_ascii_case("long");
            // 0 means full close (pass u128::MAX for SDK to interpret as full close)
            let size_delta_usd = if size_whole == 0 { u128::MAX } else { size_whole * MARKET_USD_UNIT };
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            position::close_position(&client, &store, &market_token, is_long, true, size_delta_usd, 0).await?;
        }

        // ── TAKE PROFIT ─────────────────────────────────────────────────────
        // Usage: take_profit <market_name> <long|short> <size_usd_whole> <tp_price_usd>
        "take_profit" => {
            if args.len() < 6 {
                println!("Usage: take_profit <market_name> <long|short> <size_usd_whole> <tp_price_usd>");
                return Ok(());
            }
            let market_name = &args[2];
            let side = &args[3];
            let size_whole: u128 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad size: {}", e)))?;
            let tp_usd: u128 = args[5].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad price: {}", e)))?;

            let is_long = side.eq_ignore_ascii_case("long");
            let tp_price = tp_usd * SOL_PRICE_UNIT;
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            order::take_profit(&client, &store, &market_token, is_long, true, size_whole * MARKET_USD_UNIT, tp_price).await?;
        }

        // ── STOP LOSS ───────────────────────────────────────────────────────
        // Usage: stop_loss <market_name> <long|short> <size_usd_whole> <sl_price_usd>
        "stop_loss" => {
            if args.len() < 6 {
                println!("Usage: stop_loss <market_name> <long|short> <size_usd_whole> <sl_price_usd>");
                return Ok(());
            }
            let market_name = &args[2];
            let side = &args[3];
            let size_whole: u128 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad size: {}", e)))?;
            let sl_usd: u128 = args[5].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad price: {}", e)))?;

            let is_long = side.eq_ignore_ascii_case("long");
            let sl_price = sl_usd * SOL_PRICE_UNIT;
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            order::stop_loss(&client, &store, &market_token, is_long, true, size_whole * MARKET_USD_UNIT, sl_price).await?;
        }

        // ── UPDATE ORDER ────────────────────────────────────────────────────
        // Usage: update_order <market_name> <order_address> <new_price_usd>
        "update_order" => {
            if args.len() < 5 {
                println!("Usage: update_order <market_name> <order_address> <new_price_usd>");
                return Ok(());
            }
            let market_name = &args[2];
            let order_addr = gmsol_sdk::solana_utils::solana_sdk::pubkey::Pubkey::from_str(&args[3])
                .map_err(|e| gmsol_sdk::Error::custom(format!("Invalid order address: {}", e)))?;
            let new_price_usd: u128 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad price: {}", e)))?;

            let new_trigger_price = new_price_usd * SOL_PRICE_UNIT;
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            order::update_order(&client, &store, &market_token, &order_addr, new_trigger_price).await?;
        }

        // ── CANCEL ORDER ────────────────────────────────────────────────────
        // Usage: cancel_order <order_address>
        "cancel_order" => {
            if args.len() < 3 {
                println!("Usage: cancel_order <order_address>");
                return Ok(());
            }
            let order_addr = gmsol_sdk::solana_utils::solana_sdk::pubkey::Pubkey::from_str(&args[2])
                .map_err(|e| gmsol_sdk::Error::custom(format!("Invalid order address: {}", e)))?;

            order::cancel_order(&client, &order_addr).await?;
        }

        // ── MARKET SWAP ─────────────────────────────────────────────────────
        // Usage: swap <market_name> <from_token_mint> <amount_lamports> <want_long_token: true|false>
        // Example: cargo run swap "SOL/USD[WSOL-USDC]" So11111111111111111111111111111111111111112 1000000 false
        "swap" => {
            if args.len() < 6 {
                println!("Usage: swap <market_name> <from_token_mint> <amount_lamports> <want_long_token: true|false>");
                return Ok(());
            }
            let market_name = &args[2];
            let from_token = gmsol_sdk::solana_utils::solana_sdk::pubkey::Pubkey::from_str(&args[3])
                .map_err(|e| gmsol_sdk::Error::custom(format!("Invalid token: {}", e)))?;
            let amount: u64 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad amount: {}", e)))?;
            let want_long: bool = args[5].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad flag: {}", e)))?;

            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            swap::market_swap(&client, &store, &market_token, want_long, &from_token, amount, vec![]).await?;
        }

        // ── DEPOSIT COLLATERAL ──────────────────────────────────────────────
        // Usage: deposit_collateral <market_name> <long|short> <collateral_lamports>
        "deposit_collateral" => {
            if args.len() < 5 {
                println!("Usage: deposit_collateral <market_name> <long|short> <collateral_lamports>");
                return Ok(());
            }
            let market_name = &args[2];
            let side = &args[3];
            let amount: u64 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad amount: {}", e)))?;
            let is_long = side.eq_ignore_ascii_case("long");
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            position::deposit_collateral(&client, &store, &market_token, is_long, true, amount).await?;
        }

        // ── WITHDRAW COLLATERAL ─────────────────────────────────────────────
        // Usage: withdraw_collateral <market_name> <long|short> <withdrawal_lamports>
        "withdraw_collateral" => {
            if args.len() < 5 {
                println!("Usage: withdraw_collateral <market_name> <long|short> <withdrawal_lamports>");
                return Ok(());
            }
            let market_name = &args[2];
            let side = &args[3];
            let amount: u64 = args[4].parse().map_err(|e| gmsol_sdk::Error::custom(format!("bad amount: {}", e)))?;
            let is_long = side.eq_ignore_ascii_case("long");
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            position::withdraw_collateral(&client, &store, &market_token, is_long, true, amount).await?;
        }

        // ── SETUP WALLET ────────────────────────────────────────────────────
        "setup_wallet" => {
            if args.len() < 3 {
                println!("Usage: setup_wallet <market_name>");
                return Ok(());
            }
            let market_name = &args[2];
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            wallet::setup_wallet(&client, &store, &market_token).await?;
        }

        // ── CREATE LIMIT ORDER (low-level, for testing) ─────────────────────
        "create_limit_order" => {
            if args.len() < 3 {
                println!("Usage: create_limit_order <market_name>");
                return Ok(());
            }
            let market_name = &args[2];
            let markets = client.markets(&store).await?;
            let market_token = resolve_market!(market_name, markets)
                .ok_or_else(|| gmsol_sdk::Error::custom(format!("Market '{}' not found", market_name)))?;

            order::create_limit_order(
                &client, &store, &market_token,
                true, 500_000_000, true,
                1_000 * MARKET_USD_UNIT,
                50 * SOL_PRICE_UNIT,
            ).await?;
        }

        // ── MARKET STATUS ───────────────────────────────────────────────────
        _ => {
            // Try to look up market by name
            let markets = client.markets(&store).await?;
            let mut found = false;
            for (_, m) in &markets {
                if let Ok(name) = m.name() {
                    if name.eq_ignore_ascii_case(cmd) {
                        found = true;
                        println!("\n📊 Market: {}", name);
                        println!("  Market Token: {}", m.meta.market_token_mint);
                        println!("  Long Token:   {}", m.meta.long_token_mint);
                        println!("  Short Token:  {}", m.meta.short_token_mint);
                    }
                }
            }
            if !found {
                println!("Unknown command: '{}'", cmd);
                print_usage();
            }
        }
    }

    Ok(())
}

fn print_usage() {
    println!(r#"
GMTrade CLI — Available Commands
=================================

MARKET DATA
  list_markets
  <market_name>                      Show market info (e.g. "SOL/USD[WSOL-USDC]")

TRADING — OPEN POSITIONS
  open_long   <market> <collateral_lamports> <size_usd>
  open_short  <market> <collateral_lamports> <size_usd>
  open_limit  <market> <long|short> <collateral_lamports> <size_usd> <trigger_price_usd>

TRADING — CLOSE / MANAGE POSITIONS
  close_position       <market> <long|short> <size_usd>   (0 = full close)
  take_profit          <market> <long|short> <size_usd> <tp_price_usd>
  stop_loss            <market> <long|short> <size_usd> <sl_price_usd>
  deposit_collateral   <market> <long|short> <collateral_lamports>
  withdraw_collateral  <market> <long|short> <collateral_lamports>

ORDERS
  update_order  <market> <order_address> <new_price_usd>
  cancel_order  <order_address>

SWAP
  swap          <market> <from_token_mint> <amount_lamports> <want_long_token: true|false>

POSITIONS
  list_positions

WALLET
  setup_wallet  <market>

PRICE PRECISION NOTES
  All prices are in whole USD (e.g. 150 for $150 SOL).
  Internal SDK precision: SOL price = price * 10^21, USD sizes = value * 10^20.
"#);
}