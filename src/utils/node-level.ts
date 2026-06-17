import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { getProfile, syncNodeLevel } from '../api'
import { wagmiConfig } from '../web3/config'
import { node } from '../web3/constants'

export async function getContractNodeLevel(address: Address) {
    const [activated, levelIndex] = await readContract(wagmiConfig, {
        address: node.address,
        abi: node.abi,
        functionName: 'users',
        args: [address],
    })

    if (!activated) {
        return 0
    }

    return Number(levelIndex + 1n)
}

export async function syncNodeLevelIfUpgraded(address: string) {
    const [profile, contractNodeLevel] = await Promise.all([
        getProfile(),
        getContractNodeLevel(address as Address),
    ])

    if (contractNodeLevel <= profile.nodeLevel) {
        return {
            synced: false,
            nodeLevel: profile.nodeLevel,
            contractNodeLevel,
        }
    }

    const nodeLevel = await syncNodeLevel()

    return {
        synced: true,
        nodeLevel,
        contractNodeLevel,
    }
}
