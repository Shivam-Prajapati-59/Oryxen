'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { arbitrum, arbitrumSepolia, base, baseSepolia, berachain, polygon, sepolia } from 'viem/chains';

export default function PrivyProviders({ children }: { children: React.ReactNode }) {

    const privy_app_id = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
    const isTestnet = process.env.NEXT_PUBLIC_HYPERLIQUID_IS_TESTNET === 'true';

    return (
        <PrivyProvider
            appId={privy_app_id}
            config={{
                // Create embedded wallets for BOTH Ethereum and Solana
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'all-users' // Changed to 'all-users' to ensure embedded wallet is always created
                    },
                    solana: {
                        createOnLogin: 'users-without-wallets'
                    }
                },

                // Solana RPC configuration for devnet and mainnet
                solana: {
                    rpcs: {
                        'solana:mainnet': {
                            rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
                            rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com')
                        },
                        'solana:devnet': {
                            rpc: createSolanaRpc('https://api.devnet.solana.com'),
                            rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com')
                        }
                    }
                },

                // Use Arbitrum Sepolia for testnet, Arbitrum for mainnet
                defaultChain: isTestnet ? arbitrumSepolia : arbitrum,
                supportedChains: [arbitrum, arbitrumSepolia, base, baseSepolia, berachain, polygon, sepolia]
            }}
        >
            {children}
        </PrivyProvider>
    );
}