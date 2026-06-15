import {
    getMarketOrder,
    getMarketOrdersByTransaction,
    getMarketTradesByTransaction,
    type MarketOrderStatus,
} from '../api'

const MARKET_SYNC_INTERVAL = 1500

function wait(interval = MARKET_SYNC_INTERVAL) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, interval)
    })
}

export async function waitForMarketOrderTransaction(hash: `0x${string}`, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const record = await getMarketOrdersByTransaction(hash)

        if (record.items.length > 0) {
            return record
        }

        await wait()
    }

    throw new Error('MARKET_SYNC_TIMEOUT')
}

export async function waitForMarketTradeTransaction(hash: `0x${string}`, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const record = await getMarketTradesByTransaction(hash)

        if (record.items.length > 0) {
            return record
        }

        await wait()
    }

    throw new Error('MARKET_SYNC_TIMEOUT')
}

export async function waitForMarketOrderStatus(id: `0x${string}`, status: MarketOrderStatus, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const order = await getMarketOrder(id)

        if (order?.status === status) {
            return order
        }

        await wait()
    }

    throw new Error('MARKET_SYNC_TIMEOUT')
}
