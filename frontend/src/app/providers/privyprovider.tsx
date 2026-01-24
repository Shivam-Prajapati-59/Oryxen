'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function PrivyProviders({ children }: { children: React.ReactNode }) {

    const privy_app_id = process.env.PRIVY_APP_ID || '';
    const privy_client_id = process.env.PRIVY_CLIENT_ID || '';

    return (
        <PrivyProvider
            appId={privy_app_id}
            clientId={privy_client_id}
            config={{
                // Create embedded wallets for users who don't have a wallet
                embeddedWallets: {
                    solana: {
                        createOnLogin: 'users-without-wallets'
                    }
                }
            }}
        >
            {children}
        </PrivyProvider>
    );
}