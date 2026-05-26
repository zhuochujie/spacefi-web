import { getMarketHash } from '../api'

export async function waitForMarketHash(hash: `0x${string}`, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const record = await getMarketHash(hash)

        if (record && record.eventCount > 0) {
            return record
        }

        await new Promise((resolve) => {
            window.setTimeout(resolve, 1500)
        })
    }

    throw new Error('MARKET_SYNC_TIMEOUT')
}
