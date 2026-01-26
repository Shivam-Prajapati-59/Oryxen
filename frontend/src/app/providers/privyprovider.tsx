'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { base, berachain, polygon, sepolia } from 'viem/chains';
export default function PrivyProviders({ children }: { children: React.ReactNode }) {

    const privy_app_id = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

    return (
        <PrivyProvider
            appId={privy_app_id}
            config={{
                // Create embedded wallets for users who don't have a wallet
                embeddedWallets: {
                    solana: {
                        createOnLogin: 'users-without-wallets'
                    }
                },

                defaultChain: base,
                supportedChains: [base, berachain, polygon, sepolia]
            }}
        >
            {children}
        </PrivyProvider>
    );
}