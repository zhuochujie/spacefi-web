import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { useConnection } from 'wagmi'
import { clearAccessToken, getAccessToken, getLoginAddress } from '../../api'

function WalletAuthGuard() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const location = useLocation()
    const { address, isConnected } = useConnection()

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

    return null
}

export default WalletAuthGuard
