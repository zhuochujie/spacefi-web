import { lazy, Suspense } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Route, Routes } from 'react-router'
import { Toaster } from 'react-hot-toast'
import LoginPage from './pages/login'
import BottomMenu from './components/bottom-menu'
import RequireAuth from './components/require-auth'
import AuthExpiredHandler from './components/auth-expired-handler'
import WalletAuthGuard from './components/wallet-auth-guard'
import { wagmiConfig } from './web3/config'

const IndexPage = lazy(() => import('./pages/index'))
const MinerPage = lazy(() => import('./pages/miner'))
const MinerRewardsPage = lazy(() => import('./pages/miner-rewards'))
const MarketPage = lazy(() => import('./pages/market'))
const MarketOrdersPage = lazy(() => import('./pages/market-orders'))
const PersonalPage = lazy(() => import('./pages/personal'))
const BalanceLogsPage = lazy(() => import('./pages/balance-logs'))
const TeamPage = lazy(() => import('./pages/team'))
const AboutPage = lazy(() => import('./pages/about'))
const NoticePage = lazy(() => import('./pages/notice'))
const NoticeDetailPage = lazy(() => import('./pages/notice-detail'))

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AuthExpiredHandler />
          <WalletAuthGuard />
          <Suspense fallback={<div className="route-loading" role="status" aria-label="Loading" />}>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/index" element={<RequireAuth><IndexPage /></RequireAuth>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/miner" element={<RequireAuth><MinerPage /></RequireAuth>} />
              <Route path="/miner/rewards" element={<RequireAuth><MinerRewardsPage /></RequireAuth>} />
              <Route path="/market" element={<RequireAuth><MarketPage /></RequireAuth>} />
              <Route path="/market/orders" element={<RequireAuth><MarketOrdersPage /></RequireAuth>} />
              <Route path="/personal" element={<RequireAuth><PersonalPage /></RequireAuth>} />
              <Route path="/personal/balance-logs" element={<RequireAuth><BalanceLogsPage /></RequireAuth>} />
              <Route path="/personal/team" element={<RequireAuth><TeamPage /></RequireAuth>} />
              <Route path="/personal/about" element={<RequireAuth><AboutPage /></RequireAuth>} />
              <Route path="/notice" element={<NoticePage />} />
              <Route path="/notice/:id" element={<NoticeDetailPage />} />
            </Routes>
          </Suspense>
          <BottomMenu />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
            }}
          />
        </HashRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
