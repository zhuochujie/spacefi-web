import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Route, Routes } from 'react-router'
import { Toaster } from 'react-hot-toast'
import LoginPage from './pages/login'
import AuthExpiredHandler from './components/auth-expired-handler'

const AuthenticatedApp = lazy(() => import('./web3/authenticated-app'))

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthExpiredHandler />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={(
              <Suspense fallback={<div className="route-loading" role="status" aria-label="Loading" />}>
                <AuthenticatedApp />
              </Suspense>
            )}
          />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
          }}
        />
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
