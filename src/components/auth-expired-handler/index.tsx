import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'

function AuthExpiredHandler() {
    const navigate = useNavigate()
    const location = useLocation()
    const queryClient = useQueryClient()

    useEffect(() => {
        const handleAuthExpired = () => {
            const redirect = `${location.pathname}${location.search}`

            if (location.pathname === '/' || location.pathname === '/login') {
                return
            }

            queryClient.clear()
            navigate(`/?redirect=${encodeURIComponent(redirect)}`, { replace: true })
        }

        window.addEventListener('auth:expired', handleAuthExpired)

        return () => {
            window.removeEventListener('auth:expired', handleAuthExpired)
        }
    }, [location.pathname, location.search, navigate, queryClient])

    return null
}

export default AuthExpiredHandler
