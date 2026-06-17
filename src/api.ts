import { getApiErrorKey, translate } from './i18n'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const MARKET_API_BASE_URL = import.meta.env.VITE_MARKET_API_BASE_URL || '/market-api'
const ACCESS_TOKEN_KEY = 'space_access_token'
const LOGIN_ADDRESS_KEY = 'space_login_address'

type ApiResponse<T> = {
    success?: boolean
    code?: number
    data?: T
    message?: string
}

type RequestOptions = RequestInit & {
    auth?: boolean
}

export type Miner = {
    id: string
    name: string
    price: string
    desc: string
    expectedReward: string
    isPurchasable: boolean
    isOwned: boolean
}

export type MyMiner = {
    id: number
    minerId: string
    accountId: number
    expectedReward: string
    producedReward: string
    cycle: number
    cycleEndAt: number
    lastRewardAt: number
    globalExtendedTime?: number
    rewardPerSecond: string
    createdAt: number
    miner: Miner
}

export type MyMinerData = {
    list: MyMiner[]
    minerReward: string
    teamReward: string
}

export type FreeMiner = {
    id: number
    accountId: number
    price: string
    expectedReward: string
    producedReward: string
    claimedReward: string
    availableReward?: string
    claimLimit?: string
    claimableReward?: string
    cycle: number
    cycleEndAt: number
    lastRewardAt: number
    rewardPerSecond: string
    createdAt: number
    hash: `0x${string}`
}

export type FreeMinerClaimReward = {
    freeMiner: Partial<FreeMiner>
    claimedAmount: string
    balance: string
}

export type Profile = {
    id: number
    address: string
    refCode: string
    vipLevel: number
    nodeLevel: number
    balance: string
    usdtBalance: string
    createdAt: number
}

export type BalanceLogType =
    | 'miner_reward'
    | 'team_reward'
    | 'free_miner_claim'
    | 'miner_purchase'
    | 'miner_purchase_refund'
    | 'withdraw'
    | 'withdraw_refund'
    | 'vip_dividend'
    | 'node_dividend'

export type BalanceLogToken = 'SPACE' | 'USDT'

export type BalanceLog = {
    id: number
    accountId: number
    type: BalanceLogType
    token: BalanceLogToken
    amount: string
    balanceBefore: string
    balanceAfter: string
    createdAt: number
}

export type TeamMember = {
    id: number
    address: string
    refCode: string
    vipLevel: number
    performance: string
    createdAt: number
}

export type TeamData = {
    directList: TeamMember[]
    directCount: number
    teamCount: number
    totalPerformance: string
}

export type CommissionLevel = {
    commissionLevel: number
}

export type PurchaseMinerMethod = 'internal_balance' | 'wallet_balance' | 'internal_and_wallet_balance' | 'wallet_usdt_balance'

export type PurchaseMinerSignature = {
    id: number
    accountId: number
    buyer: string
    minerId: string
    price: string
    payValue: string
    expectedReward: string
    method: PurchaseMinerMethod
    paymentToken: number
    nonce: string
    deadline: number
    signature: `0x${string}`
    status: 'pending' | 'used' | 'unused'
    createdAt: number
}

export type Notice = {
    id: string | number
    title: string
    content: string
    englishTitle?: string
    englishContent?: string
    thaiTitle?: string
    thaiContent?: string
    koreanTitle?: string
    koreanContent?: string
    createTime: number
}

export type MarketOrderSide = 'buy' | 'sell'

export type MarketOrderStatus = 'open' | 'filled' | 'cancelled'

export type MarketStats24h = {
    latestPrice: string | null
    totalSpaceAmount24h: string
    averagePrice24h: string
    tradeCount24h: number
    from: number
    to: number
}

export type MarketOrder = {
    id: string
    maker: string
    side: MarketOrderSide
    spaceAmount: string
    remainingSpaceAmount: string
    price: string
    status: MarketOrderStatus
    visible: boolean
    transactionHash: `0x${string}`
    logIndex: number
    createdAt: number
}

export type MarketTakerTrade = {
    id: string
    orderId: string
    maker: string
    taker: string
    side: MarketOrderSide
    spaceAmount: string
    price: string
    usdtAmount: string
    nodeFee: string
    markerFee: string
    transactionHash: `0x${string}`
    logIndex: number
    filledAt: number
}

export type MarketLatestPrice = {
    price: string
    trade: MarketTakerTrade | null
}

export type MinerSpaceUsdtPrice = {
    spaceUsdtPriceWei: string
}

export type MinerRewardStartAt = {
    minerRewardStartAt: number
}

export type FeeExemptClaim = {
    account: `0x${string}`
    exempt: boolean
    signature: `0x${string}`
}

export type WithdrawToken = 'SPACE' | 'USDT'

export type WithdrawSignature = {
    amount: string
    vipFee?: string
    nodeFee?: string
    nonce: string
    deadline: number
    signature: `0x${string}`
}

export type WithdrawFeeBps = {
    vipFeeBp: string
    nodeFeeBp: string
    totalFeeBp: string
}

export type PageData<T> = {
    list: T[]
    total: number
    page: number
    pageSize: number
}

type MarketItemsPageData<T> = {
    items: T[]
    total: number
    page: number
    pageSize: number
}

export function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getLoginAddress() {
    return localStorage.getItem(LOGIN_ADDRESS_KEY)
}

export function setLoginAddress(address: string) {
    localStorage.setItem(LOGIN_ADDRESS_KEY, address.toLowerCase())
}

export function clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(LOGIN_ADDRESS_KEY)
}

function notifyAuthExpired() {
    clearAccessToken()
    window.dispatchEvent(new CustomEvent('auth:expired'))
}

function isUnauthorized(response: Response, result?: ApiResponse<unknown>) {
    return response.status === 401
        || result?.code === 401
}

export async function request<T>(path: string, options: RequestOptions = {}) {
    const { auth, headers, ...init } = options
    const requestHeaders = new Headers(headers)

    if (init.body && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
    }

    if (auth) {
        const token = getAccessToken()

        if (!token) {
            notifyAuthExpired()
            throw new Error(translate('api.PLEASE_LOGIN_FIRST'))
        }

        requestHeaders.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: requestHeaders,
    })
    const result = await response.json() as ApiResponse<T>

    if (isUnauthorized(response, result)) {
        notifyAuthExpired()
        throw new Error(translate(result.message ? getApiErrorKey(result.message) : 'api.LOGIN_EXPIRED'))
    }

    if (!response.ok || result.success === false) {
        throw new Error(translate(result.message ? getApiErrorKey(result.message) : 'api.REQUEST_FAILED'))
    }

    return result.data as T
}

export async function marketRequest<T>(path: string, options: RequestInit = {}) {
    const { headers, ...init } = options
    const requestHeaders = new Headers(headers)

    if (init.body && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${MARKET_API_BASE_URL}${path}`, {
        ...init,
        headers: requestHeaders,
    })
    const result = await response.json() as ApiResponse<T>

    if (!response.ok || result.success === false) {
        throw new Error(translate(result.message ? getApiErrorKey(result.message) : 'api.REQUEST_FAILED'))
    }

    return result.data as T
}

export function getNonce(address: string) {
    return request<string>(`/nonce/${address}`)
}

export function getAccountExists(address: string) {
    return request<{ exists: boolean }>(`/auth/account/${address}/exists`)
}

export function login(address: string, signature: string) {
    return request<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ address, signature }),
    })
}

export function register(address: string, refCode: string, signature: string) {
    return request<{ access_token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ address, refCode, signature }),
    })
}

export function getProfile() {
    return request<Profile>('/auth/profile', {
        auth: true,
    })
}

export function syncNodeLevel() {
    return request<number>('/account/sync-node-level', {
        method: 'POST',
        auth: true,
    })
}

export function getBalanceLogs(page = 1, pageSize = 20, types: BalanceLogType[] = [], token?: BalanceLogToken) {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    })

    types.forEach((type) => {
        params.append('type', type)
    })

    if (token) {
        params.set('token', token)
    }

    return request<PageData<BalanceLog>>(`/account/balance-logs?${params.toString()}`, {
        auth: true,
    })
}

export function getTeam() {
    return request<TeamData>('/account/team', {
        auth: true,
    })
}

export function getCommissionLevel() {
    return request<CommissionLevel>('/account/commission-level', {
        auth: true,
    })
}

export function claimFeeExempt() {
    return request<FeeExemptClaim>('/account/claim-fee-exempt', {
        method: 'POST',
        auth: true,
    })
}

export function withdraw(amount: string) {
    return request<WithdrawSignature>('/account/withdraw', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ amount }),
    })
}

export function withdrawUsdt(amount: string) {
    return request<WithdrawSignature>('/account/withdraw-usdt', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ amount }),
    })
}

export function getWithdrawFeeBps() {
    return request<WithdrawFeeBps>('/account/withdraw-fee-bps', {
        auth: true,
    })
}

export function getMiners() {
    return request<Miner[]>('/miner', {
        auth: true,
    })
}

export function getMinerInitialCycle() {
    return request<number>('/miner/initial-cycle', {
        auth: true,
    })
}

export function getMinerSpaceUsdtPrice() {
    return request<MinerSpaceUsdtPrice>('/miner/space-usdt-price')
}

export function getMinerRewardStartAt() {
    return request<MinerRewardStartAt>('/miner/reward-start-at')
}

export function getMyMiners() {
    return request<MyMinerData>('/miner/my', {
        auth: true,
    })
}

export function submitFreeMinerHash(hash: `0x${string}`) {
    return request<unknown>('/miner/free/hash', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ hash }),
    })
}

export function getFreeMinerHash(hash: `0x${string}`) {
    return request<FreeMiner | null>(`/miner/free/hash/${hash}`, {
        auth: true,
    })
}

export function getMyFreeMiner() {
    return request<FreeMiner | null>('/miner/free/my', {
        auth: true,
    })
}

export function claimFreeMinerReward() {
    return request<FreeMinerClaimReward>('/miner/free/claim-reward', {
        method: 'POST',
        auth: true,
    })
}

export function purchaseMiner(minerId: string, method: PurchaseMinerMethod = 'wallet_balance') {
    return request<PurchaseMinerSignature>('/miner/purchase', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ minerId, method }),
    })
}

export function submitMinerNonce(nonce: string) {
    return request<unknown>('/miner/nonce', {
        method: 'POST',
        body: JSON.stringify({ nonce }),
    })
}

export function getMinerNonce(nonce: string) {
    return request<PurchaseMinerSignature | null>(`/miner/nonce/${nonce}`, {
        auth: true,
    })
}

export function getLatestNotice() {
    return request<Notice | null>('/notice/latest', {
        auth: true,
    })
}

export function getNotices(page = 1, pageSize = 20) {
    return request<PageData<Notice>>(`/notice?page=${page}&pageSize=${pageSize}`, {
        auth: true,
    })
}

export function getMarketStats24h() {
    return marketRequest<MarketStats24h>('/stats/prices')
}

export async function getMarketLatestPrice() {
    const stats = await getMarketStats24h()

    return {
        price: stats.latestPrice || '0',
        trade: null,
    } satisfies MarketLatestPrice
}

export function getMarketOrders(page = 1, pageSize = 8, side: MarketOrderSide) {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        side,
    })

    return marketRequest<MarketItemsPageData<MarketOrder>>(`/orders/open?${params.toString()}`)
        .then(({ items, ...data }) => ({ ...data, list: items }))
}

export function getMarketOrder(id: `0x${string}`) {
    return marketRequest<MarketOrder>(`/orders/${id}`).catch((error) => {
        if (error instanceof Error && error.message === translate('api.ORDER_NOT_FOUND')) {
            return null
        }

        throw error
    })
}

export function getMarketOrdersByTransaction(hash: `0x${string}`) {
    return marketRequest<{ items: MarketOrder[] }>(`/orders/by-transaction/${hash}`)
}

export function getMarketTradesByTransaction(hash: `0x${string}`) {
    return marketRequest<{ items: MarketTakerTrade[] }>(`/trades/by-transaction/${hash}`)
}

export function getMyOpenMarketOrders(maker: string, page = 1, pageSize = 8, side?: MarketOrderSide) {
    const params = new URLSearchParams({
        maker,
        page: String(page),
        pageSize: String(pageSize),
    })

    if (side) {
        params.set('side', side)
    }

    return marketRequest<MarketItemsPageData<MarketOrder>>(`/orders/mine/open?${params.toString()}`)
        .then(({ items, ...data }) => ({ ...data, list: items }))
}

export function getMyMarketOrders(maker: string, page = 1, pageSize = 8, side?: MarketOrderSide, status?: MarketOrderStatus) {
    const params = new URLSearchParams({
        maker,
        page: String(page),
        pageSize: String(pageSize),
    })

    if (side) {
        params.set('side', side)
    }

    if (status) {
        params.set('status', status)
    }

    return marketRequest<MarketItemsPageData<MarketOrder>>(`/orders/mine?${params.toString()}`)
        .then(({ items, ...data }) => ({ ...data, list: items }))
}

export function getMyMarketTakerTrades(taker: string, page = 1, pageSize = 8, side?: MarketOrderSide) {
    const params = new URLSearchParams({
        taker,
        page: String(page),
        pageSize: String(pageSize),
    })

    if (side) {
        params.set('side', side)
    }

    return marketRequest<PageData<MarketTakerTrade>>(`/trades/mine?${params.toString()}`)
}
