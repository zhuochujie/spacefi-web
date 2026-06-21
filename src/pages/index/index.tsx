import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "react-hot-toast"
import { useConnection, useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { readContract, waitForTransactionReceipt } from "@wagmi/core"
import { erc20Abi, maxUint256, type Address, type Hash } from "viem"
import {
    getLatestNotice,
    getMinerInitialCycle,
    getMinerRewardStartAt,
    getMiners,
    getMinerSpaceUsdtPrice,
    getProfile,
    purchaseMiner,
    claimFeeExempt,
    submitFreeMinerHash,
    submitMinerNonce,
    type Miner,
    type Notice,
    type PurchaseMinerMethod,
} from "../../api"
import { formatBigintAmount } from "../../utils/format"
import { waitForFreeMinerHash, waitForMinerNonceUsed } from "../../utils/miner"
import { getLocalizedNotice } from "../../utils/notice"
import { market, mining, spaceToken, usdtToken } from "../../web3/constants"
import { appChainId, wagmiConfig } from "../../web3/config"
import Modal from "../../components/modal"
import LoadingLabel from "../../components/loading-label"
import { getFriendlyErrorKey, useI18n } from "../../i18n"
import styles from "./index.module.css"
import Logo from '../../assets/images/logo.webp'
import Arrow from './images/arrow.webp'
import Safety from '../../assets/images/safety_bb.webp'
import Transparent from '../../assets/images/transparent_bb.webp'
import Efficient from '../../assets/images/efficient_bb.webp'

function getApiErrorMessage(error: unknown, fallbackKey = '') {
    if (!(error instanceof Error) || !error.message) {
        return fallbackKey
    }

    return getFriendlyErrorKey(error.message, fallbackKey)
}

function formatDateTime(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute}`
}

function getCurrentUnixTime() {
    return Math.floor(Date.now() / 1000)
}

function IndexPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { language, t } = useI18n()
    const [
        latestNoticeQuery,
        minersQuery,
        minerCycleQuery,
    ] = useQueries({
        queries: [
            { queryKey: ['notice', 'latest'], queryFn: getLatestNotice, staleTime: 60_000 },
            { queryKey: ['miners'], queryFn: getMiners, staleTime: 30_000 },
            { queryKey: ['miners', 'initial-cycle'], queryFn: getMinerInitialCycle, staleTime: 60_000 },
        ],
    })
    const latestNotice = (latestNoticeQuery.data ?? null) as Notice | null
    const latestNoticeText = latestNotice ? getLocalizedNotice(latestNotice, language) : null
    const noticeText = latestNoticeText ? `${latestNoticeText.title} ${latestNoticeText.content}` : t('home.noNotice')
    const noticeTextRef = useRef<HTMLSpanElement>(null)
    const noticeViewportRef = useRef<HTMLDivElement>(null)
    const [noticeRepeatCount, setNoticeRepeatCount] = useState(2)
    const [noticeDistance, setNoticeDistance] = useState(0)
    const [buyingMinerId, setBuyingMinerId] = useState<string | null>(null)
    const [pendingNonce, setPendingNonce] = useState('')
    const [pendingHash, setPendingHash] = useState<Hash>()
    const [claimingFeeExempt, setClaimingFeeExempt] = useState(false)
    const [claimingFreeMiner, setClaimingFreeMiner] = useState(false)
    const [selectedMiner, setSelectedMiner] = useState<Miner | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<PurchaseMinerMethod>('wallet_balance')
    const [paymentOpenedAt, setPaymentOpenedAt] = useState(0)
    const { address } = useConnection()
    const { mutateAsync: writeContract } = useWriteContract()
    const { isSuccess: isPurchaseConfirmed, isError: isPurchaseFailed } = useWaitForTransactionReceipt({
        hash: pendingHash,
        query: {
            enabled: Boolean(pendingHash),
        },
    })
    const miners = (minersQuery.data ?? []) as Miner[]
    const minerCycle = (minerCycleQuery.data ?? null) as number | null
    const walletAddress = address
    const { data: freeMinerClaimEnabled } = useQuery({
        queryKey: ['mining', 'free-miner-claim-enabled'],
        queryFn: () => readContract(wagmiConfig, {
            address: mining.address,
            abi: mining.abi,
            functionName: 'freeMinerClaimEnabled',
        }),
        staleTime: 30_000,
    })
    const { data: freeMinerClaimed } = useQuery({
        queryKey: ['mining', 'claimed-free-miners', walletAddress],
        queryFn: () => readContract(wagmiConfig, {
            address: mining.address,
            abi: mining.abi,
            functionName: 'claimedFreeMiners',
            args: [walletAddress as Address],
        }),
        enabled: Boolean(walletAddress),
        staleTime: 30_000,
    })
    const {
        data: paymentBalances,
        isLoading: balanceLoading,
    } = useQuery({
        queryKey: ['miner-payment-balances', walletAddress],
        queryFn: async () => {
            if (!walletAddress) {
                return { internalBalance: 0n, walletSpaceBalance: 0n, walletUsdtBalance: 0n, nodeLevel: 0 }
            }

            const [profile, walletSpaceBalance, walletUsdtBalance] = await Promise.all([
                getProfile(),
                readContract(wagmiConfig, {
                    address: spaceToken as Address,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [walletAddress],
                }),
                readContract(wagmiConfig, {
                    address: usdtToken as Address,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [walletAddress],
                }),
            ])

            return {
                internalBalance: BigInt(profile.balance),
                walletSpaceBalance,
                walletUsdtBalance,
                nodeLevel: profile.nodeLevel,
            }
        },
        enabled: Boolean(selectedMiner && walletAddress),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    })
    const internalBalance = paymentBalances?.internalBalance ?? 0n
    const walletSpaceBalance = paymentBalances?.walletSpaceBalance ?? 0n
    const walletUsdtBalance = paymentBalances?.walletUsdtBalance ?? 0n
    const nodeLevel = paymentBalances?.nodeLevel ?? 0
    const { data: spaceUsdtPrice } = useQuery({
        queryKey: ['miners', 'space-usdt-price'],
        queryFn: getMinerSpaceUsdtPrice,
        enabled: Boolean(selectedMiner),
        staleTime: 20_000,
    })
    const { data: minerRewardStartAt } = useQuery({
        queryKey: ['miners', 'reward-start-at'],
        queryFn: getMinerRewardStartAt,
        enabled: Boolean(selectedMiner),
        staleTime: 60_000,
    })
    const rewardStartAt = minerRewardStartAt?.minerRewardStartAt ?? 0
    const canUseWalletUsdt = nodeLevel > 0 && rewardStartAt > 0 && paymentOpenedAt > 0 && paymentOpenedAt < rewardStartAt
    const usdtPaymentEndsAtText = rewardStartAt > 0 ? formatDateTime(rewardStartAt) : ''

    const activePaymentMethod = paymentMethod === 'wallet_usdt_balance' && !canUseWalletUsdt
        ? 'wallet_balance'
        : paymentMethod

    useEffect(() => {
        function updateNoticeAnimation() {
            const viewportWidth = noticeViewportRef.current?.clientWidth || 0
            const itemWidth = noticeTextRef.current?.getBoundingClientRect().width || 0

            if (!viewportWidth || !itemWidth) {
                return
            }

            setNoticeDistance(itemWidth)
            setNoticeRepeatCount(Math.max(2, Math.ceil(viewportWidth / itemWidth) + 2))
        }

        updateNoticeAnimation()

        const observer = new ResizeObserver(updateNoticeAnimation)

        if (noticeViewportRef.current) {
            observer.observe(noticeViewportRef.current)
        }

        window.addEventListener('resize', updateNoticeAnimation)

        return () => {
            observer.disconnect()
            window.removeEventListener('resize', updateNoticeAnimation)
        }
    }, [noticeText])

    useEffect(() => {
        if (!isPurchaseConfirmed || !pendingNonce) {
            return
        }

        async function confirmPurchase() {
            try {
                await submitMinerNonce(pendingNonce)
                await waitForMinerNonceUsed(pendingNonce)
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['miners'] }),
                    queryClient.invalidateQueries({ queryKey: ['miners', 'my'] }),
                    queryClient.invalidateQueries({ queryKey: ['miner-payment-balances'] }),
                    queryClient.invalidateQueries({ queryKey: ['profile'] }),
                ])
                toast.success(t('home.purchaseSuccess'))
                setSelectedMiner(null)
            } catch (error) {
                toast.error(t(getApiErrorMessage(error) || 'home.purchaseSyncFailed'))
            } finally {
                setBuyingMinerId(null)
                setPendingHash(undefined)
                setPendingNonce('')
            }
        }

        confirmPurchase()
    }, [isPurchaseConfirmed, pendingNonce, queryClient, t])

    useEffect(() => {
        if (!isPurchaseFailed) {
            return
        }

        async function handlePurchaseFailed() {
            await Promise.resolve()
            toast.error(t('home.purchaseFailed'))
            setBuyingMinerId(null)
            setPendingHash(undefined)
            setPendingNonce('')
        }

        handlePurchaseFailed()
    }, [isPurchaseFailed, t])

    const getEstimatedUsdtPay = (miner: Miner) => {
        return BigInt(miner.price) * BigInt(spaceUsdtPrice?.spaceUsdtPriceWei || '0') / 10n ** 18n
    }

    const getAvailableBalance = (method: PurchaseMinerMethod) => {
        if (method === 'internal_balance') {
            return internalBalance
        }

        if (method === 'wallet_balance') {
            return walletSpaceBalance
        }

        if (method === 'wallet_usdt_balance') {
            return walletUsdtBalance
        }

        return internalBalance + walletSpaceBalance
    }

    const getRequiredBalance = (method: PurchaseMinerMethod, miner: Miner) => {
        if (method === 'wallet_usdt_balance') {
            return getEstimatedUsdtPay(miner)
        }

        return BigInt(miner.price)
    }

    const isBalanceEnough = (method: PurchaseMinerMethod, miner: Miner) => {
        const requiredBalance = getRequiredBalance(method, miner)

        if (method === 'wallet_usdt_balance' && requiredBalance === 0n) {
            return walletUsdtBalance > 0n
        }

        return getAvailableBalance(method) >= requiredBalance
    }

    const closePaymentModal = () => {
        setSelectedMiner(null)
    }

    const openPaymentModal = (miner: Miner) => {
        setSelectedMiner(miner)
        setPaymentOpenedAt(getCurrentUnixTime())
        setPaymentMethod('wallet_balance')
    }

    const executePurchase = async (miner: Miner, method: PurchaseMinerMethod) => {
        try {
            if (!address) {
                toast.error(t('common.connectWalletFirst'))
                throw new Error('wallet_not_connected')
            }

            if (!isBalanceEnough(method, miner)) {
                toast.error(t('common.insufficientBalance'))
                throw new Error('insufficient_balance')
            }

            setBuyingMinerId(miner.id)
            const purchase = await purchaseMiner(miner.id, method)
            const payValue = BigInt(purchase.payValue)
            const paymentToken = purchase.paymentToken ?? 0

            if (payValue > 0n) {
                const paymentTokenAddress = paymentToken === 1 ? usdtToken : spaceToken
                const allowance = await readContract(wagmiConfig, {
                    address: paymentTokenAddress as Address,
                    abi: erc20Abi,
                    functionName: 'allowance',
                    args: [address, mining.address],
                })

                if (allowance < payValue) {
                    const approveHash = await writeContract({
                        chainId: appChainId,
                        address: paymentTokenAddress as Address,
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [mining.address, maxUint256],
                    })

                    await waitForTransactionReceipt(wagmiConfig, {
                        hash: approveHash,
                    })
                }
            }

            const hash = await writeContract({
                chainId: appChainId,
                address: mining.address,
                abi: mining.abi,
                functionName: 'purchaseMiner',
                args: [
                    purchase.minerId,
                    BigInt(purchase.price),
                    payValue,
                    BigInt(purchase.expectedReward),
                    paymentToken,
                    purchase.nonce,
                    BigInt(purchase.deadline),
                    purchase.signature,
                ],
            })

            setPendingNonce(purchase.nonce)
            setPendingHash(hash)
        } catch (error) {
            if (error instanceof Error && (error.message === 'wallet_not_connected' || error.message === 'insufficient_balance')) {
                setBuyingMinerId(null)
                setPendingHash(undefined)
                setPendingNonce('')
                return
            }

            setBuyingMinerId(null)
            setPendingHash(undefined)
            setPendingNonce('')
            toast.error(t(getApiErrorMessage(error, 'common.walletActionFailed') || 'home.purchaseFailed'))
        }
    }

    const handleConfirmPayment = () => {
        if (!selectedMiner) {
            return
        }

        executePurchase(selectedMiner, activePaymentMethod)
    }

    const handleClaimFeeExempt = async () => {
        if (claimingFeeExempt) {
            return
        }

        try {
            if (!address) {
                toast.error(t('common.connectWalletFirst'))
                return
            }

            setClaimingFeeExempt(true)
            const feeExempt = await readContract(wagmiConfig, {
                address: market.address,
                abi: market.abi,
                functionName: 'feeExemptAccounts',
                args: [address],
            })

            if (feeExempt) {
                toast.success(t('home.alreadyMarketMaker'))
                return
            }

            const claim = await claimFeeExempt()
            const hash = await writeContract({
                chainId: appChainId,
                address: market.address,
                abi: market.abi,
                functionName: 'setFeeExempt',
                args: [claim.account, claim.exempt, claim.signature],
            })

            await waitForTransactionReceipt(wagmiConfig, {
                hash,
            })
            await queryClient.invalidateQueries({ queryKey: ['profile'] })
            toast.success(t('home.applySuccess'))
        } catch (error) {
            toast.error(t(getApiErrorMessage(error, 'common.walletActionFailed') || 'home.applyFailed'))
        } finally {
            setClaimingFeeExempt(false)
        }
    }

    const handleClaimFreeMiner = async () => {
        if (claimingFreeMiner) {
            return
        }

        try {
            if (!address) {
                toast.error(t('common.connectWalletFirst'))
                return
            }

            if (freeMinerClaimed) {
                toast.success(t('home.freeMinerClaimed'))
                return
            }

            setClaimingFreeMiner(true)
            const hash = await writeContract({
                chainId: appChainId,
                address: mining.address,
                abi: mining.abi,
                functionName: 'claimFreeMiner',
            })

            await waitForTransactionReceipt(wagmiConfig, {
                hash,
            })
            await submitFreeMinerHash(hash)
            await waitForFreeMinerHash(hash)
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['miners', 'free', 'my'] }),
                queryClient.invalidateQueries({ queryKey: ['miners', 'my'] }),
                queryClient.invalidateQueries({ queryKey: ['mining', 'claimed-free-miners'] }),
                queryClient.invalidateQueries({ queryKey: ['profile'] }),
            ])
            toast.success(t('home.claimFreeMinerSuccess'))
        } catch (error) {
            toast.error(t(getApiErrorMessage(error, 'common.walletActionFailed') || 'home.claimFreeMinerFailed'))
        } finally {
            setClaimingFreeMiner(false)
        }
    }

    const noticeTrackStyle = {
        '--notice-distance': `${noticeDistance}px`,
    } as CSSProperties

    return (
        <div>
            <div className={styles.top}>
                <img className={styles.logo} src={Logo} alt="Logo" />
                <div className={styles.text_con}>
                    <span>{t('home.title')}</span>
                    <span>{t('home.subtitle')}</span>
                    <span>{t('home.desc')}</span>
                </div>

                <div className={styles.notice_con}>
                    <div className={styles.left}>
                        <span>{t('home.notice')}</span>
                        <div className={styles.notice_text} ref={noticeViewportRef}>
                            <div className={styles.notice_track} style={noticeTrackStyle}>
                                {Array.from({ length: noticeRepeatCount }).map((_, index) => (
                                    <span ref={index === 0 ? noticeTextRef : undefined} key={index}>{noticeText}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.right} onClick={() => navigate('/notice')}>
                        <span>{t('home.details')}</span>
                        <img src={Arrow} alt="Notice" />
                    </div>
                </div>
            </div>

            <div className={styles.activity}>
                <div className={styles.card} onClick={handleClaimFeeExempt}>
                    <span>{claimingFeeExempt ? t('home.applying') : t('home.applyMarketMaker')}</span>
                    <span>{t('home.becomeMarketMaker')}</span>
                    <span>{t('home.earnMore')}</span>
                </div>
                <div className={styles.card} onClick={() => toast(t('common.comingSoon'))}>
                    <span>{t('common.comingSoon')}</span>
                    <span>{t('home.moreFeatures')}</span>
                    <span>{t('common.comingSoon')}</span>
                </div>
            </div>

            <div className={styles.miners}>
                <p>{t('home.allMiners')}</p>
                {freeMinerClaimEnabled && (
                    <div className={styles.miner}>
                        <img
                            src="/miners/SPACE_40.webp"
                            alt={t('home.claimFreeMiner')}
                            onError={(event) => {
                                event.currentTarget.src = '/miners/SPACE_100.webp'
                            }}
                        />
                        <div className={styles.info}>
                            <span className={styles.miner_title}>
                                {t('home.claimFreeMiner')}
                                <em>{t('common.free')}</em>
                            </span>
                            <span>{t('home.claimFreeMinerDesc')}</span>
                            <div className={styles.data}>
                                <div>
                                    <span>{t('home.output')}</span>
                                    <span>200 SPACE</span>
                                </div>
                                <div>
                                    <span>{t('home.cycle')}</span>
                                    <span>35 {t('common.days')}</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.right}>
                            <span className={styles.free_price}>
                                <s>40 <span>SPACE</span></s>
                                <span>0 <span>SPACE</span></span>
                            </span>
                            <button
                                className={styles.buy}
                                disabled={claimingFreeMiner || Boolean(freeMinerClaimed)}
                                onClick={handleClaimFreeMiner}
                            >
                                {claimingFreeMiner
                                    ? <LoadingLabel text={t('home.claimingFreeMiner')} />
                                    : freeMinerClaimed ? t('home.owned') : t('home.claimNow')}
                            </button>
                        </div>
                    </div>
                )}
                {miners.map((miner) => (
                    <div className={styles.miner} key={miner.id}>
                        <img
                            src={`/miners/${miner.id}.webp`}
                            alt={miner.name}
                            onError={(event) => {
                                event.currentTarget.src = '/miners/SPACE_100.webp'
                            }}
                        />
                        <div className={styles.info}>
                            <span>{miner.name}</span>
                            <span>{t(miner.desc)}</span>
                            <div className={styles.data}>
                                <div>
                                    <span>{t('home.output')}</span>
                                    <span>{formatBigintAmount(miner.expectedReward)} SPACE</span>
                                </div>
                                <div>
                                    <span>{t('home.cycle')}</span>
                                    <span>{minerCycle ?? '--'} {t('common.days')}</span>
                                </div>
                                <div>
                                    <span>{t('home.saleStatus')}</span>
                                    <span>{miner.isPurchasable ? t('home.onSale') : t('home.notOnSale')}</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.right}>
                            <span>{formatBigintAmount(miner.price)} <span>SPACE</span></span>
                            <button
                                className={styles.buy}
                                disabled={miner.isOwned || !miner.isPurchasable || Boolean(buyingMinerId)}
                                onClick={() => openPaymentModal(miner)}
                            >
                                {miner.isOwned
                                    ? t('home.owned')
                                    : buyingMinerId === miner.id
                                        ? <LoadingLabel text={t('common.processing')} />
                                        : t('home.buy')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.bottom}>
                <div>
                    <img src={Safety} alt="Safety" />
                    <div>
                        <span>{t('home.secure')}</span>
                        <span>{t('home.secureDesc')}</span>
                    </div>
                </div>
                <div>
                    <img src={Transparent} alt="Transparent" />
                    <div>
                        <span>{t('home.transparent')}</span>
                        <span>{t('home.transparentDesc')}</span>
                    </div>
                </div>
                <div>
                    <img src={Efficient} alt="Efficient" />
                    <div>
                        <span>{t('home.efficient')}</span>
                        <span>{t('home.efficientDesc')}</span>
                    </div>
                </div>
            </div>
            <Modal
                open={Boolean(selectedMiner)}
                title="home.paymentTitle"
                confirmText="home.confirmPurchase"
                confirmLoading={Boolean(buyingMinerId)}
                confirmDisabled={!selectedMiner || balanceLoading || Boolean(buyingMinerId) || !isBalanceEnough(activePaymentMethod, selectedMiner)}
                onCancel={closePaymentModal}
                onConfirm={handleConfirmPayment}
            >
                {selectedMiner && (
                    <div className={styles.payment_modal}>
                        <div className={styles.payment_summary}>
                            <span>{selectedMiner.name}</span>
                            <span>{formatBigintAmount(selectedMiner.price)} SPACE</span>
                        </div>
                        {[
                            { value: 'wallet_balance', label: t('home.walletBalance'), balance: walletSpaceBalance, token: 'SPACE' },
                            { value: 'internal_balance', label: t('home.accountBalance'), balance: internalBalance, token: 'SPACE' },
                            { value: 'internal_and_wallet_balance', label: t('home.accountAndWallet'), balance: internalBalance + walletSpaceBalance, token: 'SPACE' },
                            ...(canUseWalletUsdt ? [{
                                value: 'wallet_usdt_balance',
                                label: t('home.walletUsdtBalance'),
                                balance: walletUsdtBalance,
                                token: 'USDT',
                                hint: t('home.usdtPaymentEndsAt', { time: usdtPaymentEndsAtText }),
                            }] : []),
                        ].map((item) => {
                            const value = item.value as PurchaseMinerMethod
                            const enough = isBalanceEnough(value, selectedMiner)

                            return (
                                <button
                                    className={`${styles.payment_option} ${activePaymentMethod === value ? styles.payment_active : ''}`}
                                    key={value}
                                    onClick={() => setPaymentMethod(value)}
                                >
                                    <div>
                                        <span>{item.label}</span>
                                        <span>{formatBigintAmount(item.balance)} {item.token}</span>
                                        {'hint' in item && item.hint && <em>{item.hint}</em>}
                                    </div>
                                    <span className={enough ? styles.enough : styles.not_enough}>{enough ? t('home.available') : t('home.notEnough')}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default IndexPage;
