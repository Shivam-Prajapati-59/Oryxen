import React from 'react'
import TradingCardHeader from './TradingCardHeader'
import TradingViewWidget from '../custom/TradingViewWidget'
import { div } from 'motion/react-client'

const TradingCard = () => {
    return (
        <div className='space-y-3'>
            <TradingCardHeader />
            <TradingViewWidget symbol='SOLUSD' resolution='' />
        </div>
    )
}

export default TradingCard