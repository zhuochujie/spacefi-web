import { useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { waitForTransactionReceipt } from "@wagmi/core"
import { toast } from "react-hot-toast"
import { useConnection, useWriteContract } from "wagmi"
import {
    getMyMarketTakerTrades,
    getMyMarketOrders,
    getMyOpenMarketOrders,
    type MarketOrder,
    type MarketOrderSide,
    type MarketOrderStatus,
    type MarketTakerTrade,
    type PageData,
} from "../../api"
import PageHeader from "../../components/page-header"
import { formatBigintAmount } from "../../utils/format"
import { waitForMarketOrderStatus } from "../../utils/market"
import { getApiErrorKey, getFriendlyErrorKey, useI18n } from "../../i18n"
import { market } from "../../web3/constants"
import { wagmiConfig } from "../../web3/config"
import LoadingLabel from "../../components/loading-label"
import styles from "./index.module.css"

const PAGE_SIZE = 8

type OrderView = 'open' | 'history' | 'taker'
type SideFilter = 'all' | MarketOrderSide

const statusText: Record<MarketOrderStatus, string> = {
    open: 'marketOrders.open',
    filled: 'marketOrders.filled',
    cancelled: 'marketOrders.cancelled',
}

function formatTokenAmount(value: string, fractionDigits = 2) {
    return formatBigintAmount(value || '0', { fractionDigits })
}

function formatOrderId(id?: string) {
    if (!id) {
        return '--'
    }

    if (id.length <= 14) {
        return id
    }

    return `${id.slice(0, 8)}...${id.slice(-6)}`
}

function formatTime(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    return `${month}-${day} ${hour}:${minute}`
}

function MarketOrdersPage() {
    const queryClient = useQueryClient()
    const { t } = useI18n()
    const { address } = useConnection()
    const { mutateAsync: writeContract } = useWriteContract()
    const [view, setView] = useState<OrderView>('open')
    const [side, setSide] = useState<SideFilter>('all')
    const [page, setPage] = useState(1)
    const [cancellingOrderId, setCancellingOrderId] = useState('')
    const sideParam = side === 'all' ? undefined : side
    const {
        data: ordersData,
        isLoading: loading,
        isError,
        error,
    } = useQuery<PageData<MarketOrder> | PageData<MarketTakerTrade>>({
        queryKey: ['market', 'my-orders', address, view, sideParam ?? 'all', page, PAGE_SIZE],
        queryFn: () => {
            if (!address) {
                return { list: [], total: 0, page, pageSize: PAGE_SIZE }
            }

            if (view === 'open') {
                return getMyOpenMarketOrders(address, page, PAGE_SIZE, sideParam)
            }

            if (view === 'taker') {
                return getMyMarketTakerTrades(address, page, PAGE_SIZE, sideParam)
            }

            return getMyMarketOrders(address, page, PAGE_SIZE, sideParam)
        },
        placeholderData: keepPreviousData,
        staleTime: 10_000,
    })
    const orders = ordersData?.list ?? []
    const total = ordersData?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const resetPage = () => setPage(1)

    const refreshMarketData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['market'] }),
            queryClient.invalidateQueries({ queryKey: ['market', 'wallet-balances'] }),
        ])
    }

    const handleCancelOrder = async (order: MarketOrder) => {
        try {
            setCancellingOrderId(order.id)
            const hash = await writeContract({
                address: market.address,
                abi: market.abi,
                functionName: 'cancelOrder',
                args: [order.id as `0x${string}`],
            })

            await waitForTransactionReceipt(wagmiConfig, {
                hash,
            })
            await waitForMarketOrderStatus(order.id as `0x${string}`, 'cancelled')
            await refreshMarketData()
            toast.success(t('marketOrders.cancelSuccess'))
        } catch (error) {
            toast.error(error instanceof Error ? t(getFriendlyErrorKey(error.message, 'common.walletActionFailed')) : t('marketOrders.cancelFailed'))
        } finally {
            setCancellingOrderId('')
        }
    }

    return (
        <div className={styles.page}>
            <PageHeader title="pages.marketOrders" backTo="/market" />

            <div className={styles.tabs}>
                <button
                    className={view === 'open' ? styles.active_tab : ''}
                    type="button"
                    onClick={() => {
                        setView('open')
                        resetPage()
                    }}
                >
                    {t('marketOrders.current')}
                </button>
                <button
                    className={view === 'history' ? styles.active_tab : ''}
                    type="button"
                    onClick={() => {
                        setView('history')
                        resetPage()
                    }}
                >
                    {t('marketOrders.history')}
                </button>
                <button
                    className={view === 'taker' ? styles.active_tab : ''}
                    type="button"
                    onClick={() => {
                        setView('taker')
                        resetPage()
                    }}
                >
                    {t('marketOrders.taker')}
                </button>
            </div>

            <div className={styles.filters}>
                <button className={side === 'all' ? styles.active_filter : ''} type="button" onClick={() => { setSide('all'); resetPage() }}>{t('marketOrders.all')}</button>
                <button className={side === 'buy' ? styles.active_filter : ''} type="button" onClick={() => { setSide('buy'); resetPage() }}>{t('marketOrders.buyOrder')}</button>
                <button className={side === 'sell' ? styles.active_filter : ''} type="button" onClick={() => { setSide('sell'); resetPage() }}>{t('marketOrders.sellOrder')}</button>
            </div>

            <div className={styles.order_list}>
                {loading && <div className={styles.empty}>{t('market.loadingOrders')}</div>}
                {!loading && isError && <div className={styles.empty}>{error instanceof Error ? t(getApiErrorKey(error.message)) : t('market.loadOrdersFailed')}</div>}
                {!loading && !isError && orders.length === 0 && <div className={styles.empty}>{view === 'taker' ? t('marketOrders.noTaker') : t('market.noOrders')}</div>}
                {!loading && !isError && view !== 'taker' && (orders as MarketOrder[]).map((order) => (
                    <div className={styles.order_card} key={order.id}>
                        <div className={styles.order_top}>
                            <span>{order.side === 'buy' ? t('marketOrders.buyOrder') : t('marketOrders.sellOrder')}</span>
                            <div>
                                {view === 'open' && order.status === 'open' && (
                                    <button
                                        className={styles.cancel_btn}
                                        type="button"
                                        disabled={cancellingOrderId === order.id}
                                        onClick={() => handleCancelOrder(order)}
                                    >
                                        {cancellingOrderId === order.id ? <LoadingLabel text={t('marketOrders.cancelling')} /> : t('marketOrders.cancelOrder')}
                                    </button>
                                )}
                                <em className={styles[`status_${order.status}`]}>{t(statusText[order.status])}</em>
                            </div>
                        </div>
                        <div className={styles.order_id}>{formatOrderId(order.id)}</div>
                        <div className={styles.order_grid}>
                            <div>
                                <span>{t('marketOrders.remainingAmount')}</span>
                                <strong>{formatTokenAmount(order.remainingSpaceAmount)} SPACE</strong>
                            </div>
                            <div>
                                <span>{t('marketOrders.orderAmount')}</span>
                                <strong>{formatTokenAmount(order.spaceAmount)} SPACE</strong>
                            </div>
                            <div>
                                <span>{t('common.price')}</span>
                                <strong>{formatTokenAmount(order.price, 4)} USDT</strong>
                            </div>
                            <div>
                                <span>{t('marketOrders.visibility')}</span>
                                <strong>{order.visible ? t('marketOrders.public') : t('marketOrders.private')}</strong>
                            </div>
                        </div>
                    </div>
                ))}
                {!loading && !isError && view === 'taker' && (orders as MarketTakerTrade[]).map((trade) => (
                    <div className={styles.order_card} key={trade.id}>
                        <div className={styles.order_top}>
                            <span>{trade.side === 'sell' ? t('marketOrders.buySpace') : t('marketOrders.sellSpace')}</span>
                            <div>
                                <em className={styles.status_filled}>{t('marketOrders.filled')}</em>
                            </div>
                        </div>
                        <div className={styles.order_id}>
                            <span>{t('marketOrders.orderPrefix')} {formatOrderId(trade.orderId)}</span>
                            <span>{formatTime(trade.filledAt)}</span>
                        </div>
                        <div className={styles.order_grid}>
                            <div>
                                <span>{t('marketOrders.filledAmount')}</span>
                                <strong>{formatTokenAmount(trade.spaceAmount)} SPACE</strong>
                            </div>
                            <div>
                                <span>{t('common.price')}</span>
                                <strong>{formatTokenAmount(trade.price, 4)} USDT</strong>
                            </div>
                            <div>
                                <span>{t('marketOrders.total')}</span>
                                <strong>{formatTokenAmount(trade.usdtAmount, 4)} USDT</strong>
                            </div>
                            <div>
                                <span>{t('marketOrders.fee')}</span>
                                <strong>{formatTokenAmount((BigInt(trade.nodeFee || '0') + BigInt(trade.markerFee || '0')).toString(), 4)} USDT</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.pagination}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{t('common.previous')}</button>
                <span>{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>{t('common.next')}</button>
            </div>
        </div>
    )
}

export default MarketOrdersPage
