import { WagmiProvider } from 'wagmi'
import { Route, Routes } from 'react-router'
import BottomMenu from '../components/bottom-menu'
import RequireAuth from '../components/require-auth'
import WalletAuthGuard from '../components/wallet-auth-guard'
import IndexPage from '../pages/index'
import MinerPage from '../pages/miner'
import MinerRewardsPage from '../pages/miner-rewards'
import MarketPage from '../pages/market'
import MarketOrdersPage from '../pages/market-orders'
import PersonalPage from '../pages/personal'
import BalanceLogsPage from '../pages/balance-logs'
import TeamPage from '../pages/team'
import AboutPage from '../pages/about'
import NoticePage from '../pages/notice'
import NoticeDetailPage from '../pages/notice-detail'
import { wagmiConfig } from './config'

function AuthenticatedApp() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <WalletAuthGuard />
      <Routes>
        <Route path="/index" element={<RequireAuth><IndexPage /></RequireAuth>} />
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
      <BottomMenu />
    </WagmiProvider>
  )
}

export default AuthenticatedApp
