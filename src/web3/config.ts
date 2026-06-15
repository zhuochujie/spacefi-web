// import { bsc } from 'viem/chains'
import { bscTestnet as bsc } from 'viem/chains'
import { createConfig, http, injected } from 'wagmi'

export const wagmiConfig = createConfig({
    chains: [bsc],
    connectors: [injected()],
    transports: {
        [bsc.id]: http(),
    },
})
