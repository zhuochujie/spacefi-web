import { useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { multicall, readContract, waitForTransactionReceipt } from "@wagmi/core"
import { erc20Abi, keccak256, parseUnits, stringToBytes, maxUint256, type Address } from "viem"
import copy from "copy-to-clipboard"
import { toast } from "react-hot-toast"
import { useConnection, useWriteContract } from "wagmi"
import {
    getMarketOrders,
    getMarketOrder,
    getMarketStats24h,
    submitMarketHash,
    type MarketOrder,
    type MarketOrderSide,
} from "../../api"
import { formatBigintAmount } from "../../utils/format"
import { waitForMarketHash } from "../../utils/market"
import { getApiErrorKey, getFriendlyErrorKey, useI18n } from "../../i18n"
import { market, spaceToken, usdtToken } from "../../web3/constants"
import { wagmiConfig } from "../../web3/config"
import styles from "./index.module.css"
import TopBG from './images/top_bg2.png'
import AddIcon from './images/add.svg'
import CopyIcon from './images/copy.svg'
import DetailsIcon from './images/details.svg'
import LockIcon from './images/lock.svg'
import SecurityIcon from './images/security.svg'
import Modal from "../../components/modal"

const MARKET_PAGE_SIZE = 8

function formatOrderId(id: string) {
    if (id.length <= 10) {
        return id
    }

    return `${id.slice(0, 6)}...${id.slice(-4)}`
}

function formatTokenAmount(value: string, fractionDigits = 2) {
    return formatBigintAmount(value, { fractionDigits })
}

function parseTokenInput(value: string) {
    try {
        return Number(value) > 0 ? parseUnits(value, 18) : 0n
    } catch {
        return 0n
    }
}

function createOrderIdSource() {
    return String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000))
}

function getUsdtAfterFee(
    usdtAmount: bigint,
    spaceAmount: bigint,
    marketConfig?: { nodeFeeBps: bigint; markerFeeBps: bigint; bpsDenominator: bigint; feeExemptSpaceQuota: bigint },
) {
    if (!marketConfig || marketConfig.bpsDenominator <= 0n || spaceAmount <= 0n) {
        return usdtAmount
    }

    const exemptSpaceAmount = marketConfig.feeExemptSpaceQuota

    if (exemptSpaceAmount >= spaceAmount) {
        return usdtAmount
    }

    const taxableUsdtAmount = exemptSpaceAmount > 0n
        ? usdtAmount * (spaceAmount - exemptSpaceAmount) / spaceAmount
        : usdtAmount
    const exemptUsdtAmount = usdtAmount - taxableUsdtAmount

    if (taxableUsdtAmount <= 0n) {
        return usdtAmount
    }

    const totalFeeBps = marketConfig.nodeFeeBps + marketConfig.markerFeeBps

    if (totalFeeBps <= 0n) {
        return usdtAmount
    }

    if (totalFeeBps >= marketConfig.bpsDenominator) {
        return exemptUsdtAmount
    }

    return exemptUsdtAmount + taxableUsdtAmount * (marketConfig.bpsDenominator - totalFeeBps) / marketConfig.bpsDenominator
}

function MarketPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { t } = useI18n()
    const { address } = useConnection()
    const { mutateAsync: writeContract } = useWriteContract()
    const [tradeMode, setTradeMode] = useState<MarketOrderSide>('buy')
    const [publishMode, setPublishMode] = useState<MarketOrderSide>('sell')
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<MarketOrder | null>(null)
    const [selectedOrderSource, setSelectedOrderSource] = useState('')
    const [orderAmount, setOrderAmount] = useState('')
    const [privateCodeModalOpen, setPrivateCodeModalOpen] = useState(false)
    const [privateCode, setPrivateCode] = useState('')
    const [privateCodeLoading, setPrivateCodeLoading] = useState(false)
    const [fillingOrder, setFillingOrder] = useState(false)
    const [publishAmount, setPublishAmount] = useState('')
    const [publishPrice, setPublishPrice] = useState('')
    const [publishVisible, setPublishVisible] = useState(true)
    const [publishOrderIdSource, setPublishOrderIdSource] = useState(createOrderIdSource)
    const [publishing, setPublishing] = useState(false)
    const [page, setPage] = useState(1)
    const orderBookSide: MarketOrderSide = tradeMode === 'buy' ? 'sell' : 'buy'
    const { data: marketStats } = useQuery({
        queryKey: ['market', 'stats', '24h'],
        queryFn: getMarketStats24h,
        staleTime: 30_000,
    })
    const { data: walletBalances } = useQuery({
        queryKey: ['market', 'wallet-balances', address],
        queryFn: async () => {
            if (!address) {
                return { usdt: 0n, space: 0n }
            }

            const [usdt, space] = await multicall(wagmiConfig, {
                allowFailure: false,
                contracts: [
                    {
                        address: usdtToken as Address,
                        abi: erc20Abi,
                        functionName: 'balanceOf',
                        args: [address],
                    },
                    {
                        address: spaceToken as Address,
                        abi: erc20Abi,
                        functionName: 'balanceOf',
                        args: [address],
                    },
                ],
            })

            return { usdt, space }
        },
        enabled: Boolean(address),
        staleTime: 30_000,
    })
    const { data: marketConfig } = useQuery({
        queryKey: ['market', 'config', address],
        queryFn: async () => {
            if (!address) {
                return undefined
            }

            const [
                minPrice,
                maxPrice,
                minOrderSpaceAmount,
                nodeFeeBps,
                markerFeeBps,
                bpsDenominator,
                feeExempt,
                feeExemptSpaceQuota,
            ] = await multicall(wagmiConfig, {
                allowFailure: false,
                contracts: [
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'minPrice',
                    },
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'maxPrice',
                    },
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'minOrderSpaceAmount',
                    },
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'nodeFeeBps',
                    },
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'markerFeeBps',
                    },
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'BPS_DENOMINATOR',
                    },
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'feeExemptAccounts',
                        args: [address],
                    },
                    {
                        address: market.address,
                        abi: market.abi,
                        functionName: 'feeExemptSpaceQuotas',
                        args: [address],
                    },
                ],
            })

            return { minPrice, maxPrice, minOrderSpaceAmount, nodeFeeBps, markerFeeBps, bpsDenominator, feeExempt, feeExemptSpaceQuota }
        },
        enabled: Boolean(address),
        staleTime: 60_000,
    })
    const {
        data: ordersData,
        isLoading: ordersLoading,
        isError: ordersIsError,
        error: ordersError,
    } = useQuery({
        queryKey: ['market', 'orders', orderBookSide, page, MARKET_PAGE_SIZE],
        queryFn: () => getMarketOrders(page, MARKET_PAGE_SIZE, orderBookSide),
        placeholderData: keepPreviousData,
        staleTime: 10_000,
    })
    const marketOrders = ordersData?.list ?? []
    const total = ordersData?.total ?? 0
    const actionKey = tradeMode === 'buy' ? 'market.buy' : 'market.sell'
    const actionBalanceText = tradeMode === 'buy'
        ? `${formatBigintAmount(walletBalances?.usdt ?? 0n)} USDT`
        : `${formatBigintAmount(walletBalances?.space ?? 0n)} SPACE`
    const publishBalanceText = publishMode === 'buy'
        ? `${formatBigintAmount(walletBalances?.usdt ?? 0n)} USDT`
        : `${formatBigintAmount(walletBalances?.space ?? 0n)} SPACE`
    const parsedOrderAmount = Number(orderAmount)
    const selectedOrderAmount = selectedOrder ? formatTokenAmount(selectedOrder.remainingSpaceAmount) : '0'
    const selectedOrderPrice = selectedOrder ? formatTokenAmount(selectedOrder.price, 4) : '0'
    const orderAmountWei = parseTokenInput(orderAmount)
    const orderTotalWei = selectedOrder ? orderAmountWei * BigInt(selectedOrder.price) / 10n ** 18n : 0n
    const orderReceivesUsdt = selectedOrder?.side === 'buy'
    const orderDisplayTotalWei = orderReceivesUsdt ? getUsdtAfterFee(orderTotalWei, orderAmountWei, marketConfig) : orderTotalWei
    const orderTotal = formatBigintAmount(orderDisplayTotalWei, { fractionDigits: 2, fixed: true })
    const isOrderAmountValid = selectedOrder
        ? parsedOrderAmount > 0 && parsedOrderAmount <= Number(selectedOrderAmount.replace(/,/g, ''))
        : false
    const publishAmountWei = parseTokenInput(publishAmount)
    const publishPriceWei = parseTokenInput(publishPrice)
    const publishPayWei = publishAmountWei * publishPriceWei / 10n ** 18n
    const publishReceivesUsdt = publishMode === 'sell'
    const publishDisplayPayWei = publishReceivesUsdt ? getUsdtAfterFee(publishPayWei, publishAmountWei, marketConfig) : publishPayWei
    const publishPayText = formatBigintAmount(publishDisplayPayWei)
    const feeExemptSpaceQuotaWei = marketConfig?.feeExemptSpaceQuota ?? 0n
    const feeExemptSpaceQuotaText = formatBigintAmount(feeExemptSpaceQuotaWei)
    const publishBalanceWei = publishMode === 'buy'
        ? walletBalances?.usdt ?? 0n
        : walletBalances?.space ?? 0n
    const publishRequiredWei = publishMode === 'buy' ? publishPayWei : publishAmountWei
    const hasPublishAmountInput = publishAmount.trim() !== ''
    const hasPublishPriceInput = publishPrice.trim() !== ''
    const isPublishAmountValid = marketConfig
        ? publishAmountWei >= marketConfig.minOrderSpaceAmount
        : publishAmountWei > 0n
    const isPublishPriceValid = marketConfig
        ? publishPriceWei >= marketConfig.minPrice && publishPriceWei <= marketConfig.maxPrice
        : publishPriceWei > 0n
    const isPublishBalanceEnough = publishRequiredWei <= publishBalanceWei
    const isPublishValid = isPublishAmountValid && isPublishPriceValid && isPublishBalanceEnough
    const publishPriceHint = marketConfig
        ? `${formatBigintAmount(marketConfig.minPrice, { fractionDigits: 4 })} - ${formatBigintAmount(marketConfig.maxPrice, { fractionDigits: 4 })} USDT`
        : ''
    const shouldShowAmountError = hasPublishAmountInput && !isPublishAmountValid
    const shouldShowPriceError = hasPublishPriceInput && !isPublishPriceValid
    const totalPages = Math.max(1, Math.ceil(total / MARKET_PAGE_SIZE))

    const refreshMarketData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['market'] }),
            queryClient.invalidateQueries({ queryKey: ['market', 'wallet-balances'] }),
        ])
    }

    const resetPublishForm = () => {
        setPublishAmount('')
        setPublishPrice('')
        setPublishVisible(true)
        setPublishOrderIdSource(createOrderIdSource())
    }

    const openOrderDialog = (order: MarketOrder, orderSource = '') => {
        setSelectedOrder(order)
        setSelectedOrderSource(orderSource)
        setOrderAmount('')
    }

    const closeOrderDialog = () => {
        setSelectedOrder(null)
        setSelectedOrderSource('')
        setOrderAmount('')
    }

    const handleCopy = async (text: string) => {
        if (await copy(text)) {
            toast.success(t('common.copied'))
            return
        }

        toast.error(t('common.copyFailed'))
    }

    const handlePrivateCodeLookup = async () => {
        try {
            if (!privateCode.trim()) {
                toast.error(t('market.privateCodeRequired'))
                return
            }

            setPrivateCodeLoading(true)
            const code = privateCode.trim()
            const orderId = keccak256(stringToBytes(code))
            const order = await getMarketOrder(orderId)

            if (!order) {
                toast.error(t('market.orderNotFound'))
                return
            }

            setPrivateCodeModalOpen(false)
            setPrivateCode('')
            setTradeMode(order.side === 'buy' ? 'sell' : 'buy')
            openOrderDialog(order, code)
        } catch (error) {
            toast.error(error instanceof Error ? t(getApiErrorKey(error.message)) : t('market.queryFailed'))
        } finally {
            setPrivateCodeLoading(false)
        }
    }

    const handleFillOrder = async () => {
        try {
            if (!selectedOrder || !isOrderAmountValid) {
                return
            }

            if (!address) {
                toast.error(t('common.connectWalletFirst'))
                return
            }

            setFillingOrder(true)
            const amountWei = parseTokenInput(orderAmount)
            const orderSource = selectedOrderSource || selectedOrder.id
            const tokenAddress = selectedOrder.side === 'sell' ? usdtToken : spaceToken
            const approveAmount = selectedOrder.side === 'sell' ? orderTotalWei : amountWei
            const allowance = await readContract(wagmiConfig, {
                address: tokenAddress as Address,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [address, market.address],
            })

            if (allowance < approveAmount) {
                const approveHash = await writeContract({
                    address: tokenAddress as Address,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [market.address, maxUint256],
                })

                await waitForTransactionReceipt(wagmiConfig, {
                    hash: approveHash,
                })
            }
            
            const hash = await writeContract({
                address: market.address,
                abi: market.abi,
                functionName: 'fillOrder',
                args: [selectedOrder.id as `0x${string}`, amountWei, orderSource],
            })

            await waitForTransactionReceipt(wagmiConfig, {
                hash,
            })
            await submitMarketHash(hash)
            await waitForMarketHash(hash)
            await refreshMarketData()
            toast.success(`${t(actionKey)}${t('common.success')}`)
            closeOrderDialog()
        } catch (error) {
            toast.error(error instanceof Error ? t(getFriendlyErrorKey(error.message, 'common.walletActionFailed')) : `${t(actionKey)}${t('common.failedRetry')}`)
        } finally {
            setFillingOrder(false)
        }
    }

    const handlePublishOrder = async () => {
        try {
            if (!address) {
                toast.error(t('common.connectWalletFirst'))
                return
            }

            if (!isPublishValid) {
                toast.error(t('market.publishInvalid'))
                return
            }

            setPublishing(true)
            const orderId = keccak256(stringToBytes(publishOrderIdSource))
            const tokenAddress = publishMode === 'buy' ? usdtToken : spaceToken
            const approveAmount = publishMode === 'buy' ? publishPayWei : publishAmountWei
            const allowance = await readContract(wagmiConfig, {
                address: tokenAddress as Address,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [address, market.address],
            })

            if (allowance < approveAmount) {
                const approveHash = await writeContract({
                    address: tokenAddress as Address,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [market.address, maxUint256],
                })

                await waitForTransactionReceipt(wagmiConfig, {
                    hash: approveHash,
                })
            }
            const hash = await writeContract({
                address: market.address,
                abi: market.abi,
                functionName: publishMode === 'buy' ? 'placeBuyOrder' : 'placeSellOrder',
                args: [orderId, publishAmountWei, publishPriceWei, publishVisible],
            })

            await waitForTransactionReceipt(wagmiConfig, {
                hash,
            })
            await submitMarketHash(hash)
            await waitForMarketHash(hash)
            await refreshMarketData()
            toast.success(t('market.publishSuccess'))
            setIsPublishModalOpen(false)
            resetPublishForm()
        } catch (error) {
            toast.error(error instanceof Error ? t(getFriendlyErrorKey(error.message, 'common.walletActionFailed')) : t('market.publishFailed'))
        } finally {
            setPublishing(false)
        }
    }

    return ( 
        <div>
            <div className={styles.top}>
                <div className={styles.text_con}>
                    <span>{t('nav.miner')}</span>
                    <span>{t('market.use')} <span className={styles.usdt}>USDT</span> {t('market.trade')} <span className={styles.space}>SPACE</span></span>
                    <div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                    <span>{t('market.tagline')}</span>
                </div>
                <img src={TopBG} alt="" />
            </div>
            <div className={styles.data_con}>
                <div className={styles.market_stats}>
                    <div>
                        <span>{t('market.volume24h')}</span>
                        <strong>{marketStats ? formatTokenAmount(marketStats.spaceVolume24h) : '0'}</strong>
                    </div>
                    <div>
                        <span>{t('market.avgPrice24h')}</span>
                        <strong>{marketStats ? formatTokenAmount(marketStats.averagePrice24h, 4) : '0'}</strong>
                    </div>
                </div>

                <div className={styles.trade_panel}>
                    <div className={styles.trade_tabs}>
                        <button
                            className={tradeMode === 'buy' ? styles.trade_tab_active : ''}
                            type="button"
                            onClick={() => {
                                setTradeMode('buy')
                                setPage(1)
                            }}
                        >
                            {t('market.wantBuy')}
                        </button>
                        <button
                            className={tradeMode === 'sell' ? styles.trade_tab_active : ''}
                            type="button"
                            onClick={() => {
                                setTradeMode('sell')
                                setPage(1)
                            }}
                        >
                            {t('market.wantSell')}
                        </button>
                    </div>

                    <div className={styles.order_header}>
                        <span>{t('market.orderId')}</span>
                        <span>{t('market.amountSpace')}</span>
                        <span>{t('market.priceUsdt')}</span>
                        <span></span>
                    </div>

                    <div className={styles.order_list}>
                        {ordersLoading && <div className={styles.order_state}>{t('market.loadingOrders')}</div>}
                        {!ordersLoading && ordersIsError && <div className={styles.order_state}>{ordersError instanceof Error ? t(ordersError.message) : t('market.loadOrdersFailed')}</div>}
                        {!ordersLoading && !ordersIsError && marketOrders.length === 0 && <div className={styles.order_state}>{t('market.noOrders')}</div>}
                        {!ordersLoading && !ordersIsError && marketOrders.map((order) => (
                            <div className={styles.order_item} key={order.id}>
                                <div className={styles.order_id}>
                                    <span>{formatOrderId(order.id)}</span>
                                    <button type="button" aria-label={t('market.copyOrderId')} onClick={() => handleCopy(order.id)}>
                                        <img src={CopyIcon} alt="" />
                                    </button>
                                </div>
                                <strong>{formatTokenAmount(order.remainingSpaceAmount)}</strong>
                                <div className={styles.order_price}>
                                    <strong>{formatTokenAmount(order.price, 4)}</strong>
                                    <span>USDT</span>
                                </div>
                                <button
                                    className={styles.buy_btn}
                                    type="button"
                                    onClick={() => {
                                        openOrderDialog(order)
                                    }}
                                >
                                    {t(actionKey)}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.pagination}>
                        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{t('common.previous')}</button>
                        <span>{page} / {totalPages}</span>
                        <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>{t('common.next')}</button>
                    </div>

                    <div className={styles.trade_footer}>
                        <div>
                            <img className={styles.footer_icon} src={SecurityIcon} alt="" />
                            <span>{t('market.safetyText')}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.action_grid}>
                    <button
                        className={styles.publish_btn}
                        type="button"
                        onClick={() => {
                            setPublishOrderIdSource(createOrderIdSource())
                            setIsPublishModalOpen(true)
                        }}
                    >
                        <img src={AddIcon} alt="" />
                        {t('market.publishOrder')}
                    </button>
                    <button className={styles.my_order_btn} type="button" onClick={() => navigate('/market/orders')}>
                        <img src={DetailsIcon} alt="" />
                        {t('market.myOrders')}
                    </button>
                </div>

                <button className={styles.private_order} type="button" onClick={() => setPrivateCodeModalOpen(true)}>
                    <img className={styles.lock_icon} src={LockIcon} alt="" />
                    <span>
                        <strong>{t('market.matchPrivateOrder')}</strong>
                        <em>{t('market.privateOrderDesc')}</em>
                    </span>
                    <span className={styles.private_arrow}>›</span>
                </button>
            </div>
            <Modal
                open={isPublishModalOpen}
                title="market.publishOrder"
                confirmText={publishing ? 'market.publishing' : 'market.publish'}
                confirmLoading={publishing}
                confirmDisabled={!isPublishValid || publishing}
                onCancel={() => {
                    setIsPublishModalOpen(false)
                    resetPublishForm()
                }}
                onConfirm={handlePublishOrder}
            >
                <div className={styles.publish_form}>
                    <label>
                        <span>{t('market.direction')}</span>
                        <div className={styles.publish_mode}>
                            <button className={publishMode === 'sell' ? styles.publish_mode_active : ''} type="button" onClick={() => setPublishMode('sell')}>{t('market.wantSell')}</button>
                            <button className={publishMode === 'buy' ? styles.publish_mode_active : ''} type="button" onClick={() => setPublishMode('buy')}>{t('market.wantBuy')}</button>
                        </div>
                    </label>
                    <label>
                        <span className={styles.publish_label}>
                            {t('common.amount')}
                            <em>{t('common.balancePrefix')}{publishBalanceText}</em>
                        </span>
                        <div className={styles.publish_input}>
                            <input
                                value={publishAmount}
                                placeholder={t('market.enterAmount')}
                                inputMode="decimal"
                                onChange={(event) => setPublishAmount(event.target.value)}
                            />
                            <em>SPACE</em>
                        </div>
                        {shouldShowAmountError && <small className={styles.input_error}>{t('common.min')} {formatBigintAmount(marketConfig?.minOrderSpaceAmount ?? 0n)} SPACE</small>}
                    </label>
                    <label>
                        <span className={styles.publish_label}>
                            {t('common.price')}
                            {publishPriceHint && <em>{publishPriceHint}</em>}
                        </span>
                        <div className={styles.publish_input}>
                            <input
                                value={publishPrice}
                                placeholder={t('market.enterPrice')}
                                inputMode="decimal"
                                onChange={(event) => setPublishPrice(event.target.value)}
                            />
                            <em>USDT</em>
                        </div>
                        {publishPriceHint && shouldShowPriceError && <small className={styles.input_error}>{t('market.priceOutOfRange')}</small>}
                    </label>
                    <div className={styles.publish_total}>
                        <span>{publishMode === 'buy' ? t('market.estimatedFrozen') : t('market.estimatedReceive')}</span>
                        <strong>{publishPayText} USDT</strong>
                    </div>
                    {publishMode === 'sell' && feeExemptSpaceQuotaWei > 0n && (
                        <div className={styles.fee_quota}>
                            <div className={styles.fee_quota_main}>
                                <span>{t('market.feeExemptQuota')}</span>
                                <strong>{feeExemptSpaceQuotaText} SPACE</strong>
                            </div>
                            <em>{t('market.feeExemptQuotaHint')}</em>
                        </div>
                    )}
                    <label className={styles.privacy_option}>
                        <span>
                            <strong>{t('market.privateOrder')}</strong>
                            <em>{t('market.privateOrderHint')}</em>
                        </span>
                        <input
                            checked={!publishVisible}
                            type="checkbox"
                            onChange={(event) => setPublishVisible(!event.target.checked)}
                        />
                    </label>
                    {!publishVisible && (
                        <div className={styles.order_source}>
                            <span>{t('market.privateCode')}</span>
                            <div>
                                <strong>{publishOrderIdSource}</strong>
                                <button
                                    type="button"
                                    aria-label={t('market.copyPrivateCode')}
                                    onClick={() => handleCopy(publishOrderIdSource)}
                                >
                                    <img src={CopyIcon} alt="" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            <Modal
                open={privateCodeModalOpen}
                title="market.matchPrivateOrder"
                confirmText={privateCodeLoading ? 'market.querying' : 'market.queryOrder'}
                confirmLoading={privateCodeLoading}
                confirmDisabled={privateCodeLoading || !privateCode.trim()}
                onCancel={() => {
                    setPrivateCodeModalOpen(false)
                    setPrivateCode('')
                }}
                onConfirm={handlePrivateCodeLookup}
            >
                <div className={styles.publish_form}>
                    <label>
                        <span>{t('market.privateCode')}</span>
                        <div className={styles.publish_input}>
                            <input
                                value={privateCode}
                                placeholder={t('market.privateCodeRequired')}
                                inputMode="numeric"
                                onChange={(event) => setPrivateCode(event.target.value)}
                            />
                        </div>
                    </label>
                </div>
            </Modal>
            <Modal
                open={Boolean(selectedOrder)}
                title={`${t(actionKey)}${t('common.order')}`}
                confirmText={fillingOrder ? 'common.processing' : actionKey}
                confirmLoading={fillingOrder}
                confirmDisabled={!isOrderAmountValid || fillingOrder}
                onCancel={closeOrderDialog}
                onConfirm={handleFillOrder}
            >
                {selectedOrder && (
                    <div className={styles.order_dialog}>
                        <div>
                            <span>{t('market.tradableAmount')}</span>
                            <strong>{selectedOrderAmount} SPACE</strong>
                        </div>
                        <div>
                            <span>{t('common.price')}</span>
                            <strong>{selectedOrderPrice} USDT</strong>
                        </div>
                        <label className={styles.order_amount_field}>
                            <span>
                                {t(actionKey)}{t('common.amount')}
                                <em>{t('common.balancePrefix')}{actionBalanceText}</em>
                            </span>
                            <div className={styles.publish_input}>
                                <input
                                    value={orderAmount}
                                    placeholder={t('market.enterAmount')}
                                    inputMode="decimal"
                                    onChange={(event) => setOrderAmount(event.target.value)}
                                />
                                <em>SPACE</em>
                            </div>
                        </label>
                        <div>
                            <span>{t(orderReceivesUsdt ? 'market.estimatedReceive' : 'market.estimatedTotal')}</span>
                            <strong>{orderTotal} USDT</strong>
                        </div>
                        {selectedOrder.side === 'buy' && feeExemptSpaceQuotaWei > 0n && (
                            <div className={styles.fee_quota}>
                                <div className={styles.fee_quota_main}>
                                    <span>{t('market.feeExemptQuota')}</span>
                                    <strong>{feeExemptSpaceQuotaText} SPACE</strong>
                                </div>
                                <em>{t('market.feeExemptQuotaHint')}</em>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
     );
}

export default MarketPage;
