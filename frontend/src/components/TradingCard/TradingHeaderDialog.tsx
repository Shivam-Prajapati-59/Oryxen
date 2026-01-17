import { useAllPerps } from '@/hooks/useAllPerps';
import React from 'react'

const TradingHeaderDialog = () => {
    const { data, isLoading, error } = useAllPerps();

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            {data?.map((perp) => (
                <div key={`${perp.protocol}-${perp.symbol}`}>
                    <img src={perp.imageUrl} alt={perp.symbol} width={32} height={32} />
                    <span>{perp.symbol}</span>
                    <span className="text-muted">{perp.protocol}</span>
                </div>
            ))}
        </div>
    );
}

export default TradingHeaderDialog