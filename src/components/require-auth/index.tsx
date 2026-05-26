import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { getAccessToken } from '../../api'

type RequireAuthProps = {
    children: ReactNode
}

function RequireAuth({ children }: RequireAuthProps) {
    const location = useLocation()
    const token = getAccessToken()

    if (!token) {
        const redirect = `${location.pathname}${location.search}`

        return <Navigate to={`/?redirect=${encodeURIComponent(redirect)}`} replace />
    }

    return children
}

export default RequireAuth
