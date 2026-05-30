import { getFreeMinerHash, getMinerNonce, type FreeMiner } from '../api'

export async function waitForMinerNonceUsed(nonce: string, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const record = await getMinerNonce(nonce)

        if (record?.status === 'used') {
            return record
        }

        if (record?.status === 'unused') {
            throw new Error('PURCHASE_SIGNATURE_EXPIRED')
        }

        await new Promise((resolve) => {
            window.setTimeout(resolve, 1500)
        })
    }

    throw new Error('PURCHASE_SYNC_TIMEOUT')
}

export async function waitForFreeMinerHash(hash: `0x${string}`, maxAttempts = 20): Promise<FreeMiner> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const record = await getFreeMinerHash(hash)

        if (record) {
            return record
        }

        await new Promise((resolve) => {
            window.setTimeout(resolve, 1500)
        })
    }

    throw new Error('FREE_MINER_SYNC_TIMEOUT')
}
