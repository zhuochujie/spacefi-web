import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { useConnection } from 'wagmi'
import { clearAccessToken, getAccessToken, getLoginAddress } from '../../api'
import { appChainId, ensureAppChain } from '../../web3/config'

function WalletAuthGuard() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const location = useLocation()
    const { address, chainId, connector, isConnected } = useConnection()

    useEffect(() => {
        const token = getAccessToken()
        const loginAddress = getLoginAddress()

        if (!token || location.pathname === '/' || location.pathname === '/login') {
            return
        }

        const redirect = `${location.pathname}${location.search}`

        if (!isConnected || !address) {
            clearAccessToken()
            queryClient.clear()
            navigate(`/?redirect=${encodeURIComponent(redirect)}`, { replace: true })
            return
        }

        if (loginAddress && address.toLowerCase() !== loginAddress) {
            clearAccessToken()
            queryClient.clear()
            navigate(`/?redirect=${encodeURIComponent(redirect)}`, { replace: true })
        }
    }, [address, isConnected, location.pathname, location.search, navigate, queryClient])

    useEffect(() => {
        if (!isConnected || chainId === appChainId) {
            return
        }

        void ensureAppChain({ chainId, connector }).catch(() => {
            // Contract writes also declare appChainId, so a rejected switch cannot send on another chain.
        })
    }, [chainId, connector, isConnected])

    return null
}

export default WalletAuthGuard
