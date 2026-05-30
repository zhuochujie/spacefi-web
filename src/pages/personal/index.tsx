import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { useConnection, useWriteContract } from "wagmi"
import { waitForTransactionReceipt } from "@wagmi/core"
import { parseUnits } from "viem"
import multiavatar from "@multiavatar/multiavatar"
import copy from "copy-to-clipboard"
import { toast } from "react-hot-toast"
import { clearAccessToken, getBalanceLogs, getLoginAddress, getMarketLatestPrice, getProfile, withdraw, withdrawUsdt, type BalanceLogType, type WithdrawToken } from "../../api"
import Modal from "../../components/modal"
import { getFriendlyErrorKey, useI18n } from "../../i18n"
import { formatBigintAmount } from "../../utils/format"
import { mining } from "../../web3/constants"
import { wagmiConfig } from "../../web3/config"
import styles from "./index.module.css"
import SpaceIcon from "./images/token2.svg"
import UsdtIcon from "./images/USDT.svg"
import VisibleIcon from "./images/visible.svg"
import InvisibleIcon from "./images/invisible.svg"

const balanceLogText: Record<BalanceLogType, string> = {
    miner_reward: 'logType.miner_reward',
    team_reward: 'logType.team_reward',
    free_miner_claim: 'logType.free_miner_claim',
    miner_purchase: 'logType.miner_purchase',
    miner_purchase_refund: 'logType.miner_purchase_refund',
    withdraw: 'logType.withdraw',
    withdraw_refund: 'logType.withdraw_refund',
    vip_dividend: 'logType.vip_dividend',
    node_dividend: 'logType.node_dividend',
}

function formatAddress(address?: string | null) {
    if (!address) {
        return '--'
    }

    return `${address.slice(0, 7)}...${address.slice(-5)}`
}

function formatTime(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    return `${month}-${day} ${hour}:${minute}`
}

function parseAmountInput(value: string) {
    try {
        return Number(value) > 0 ? parseUnits(value, 18) : 0n
    } catch {
        return 0n
    }
}

function PersonalPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { t } = useI18n()
    const { address } = useConnection()
    const { mutateAsync: writeContract } = useWriteContract()
    const [assetVisible, setAssetVisible] = useState(true)
    const [withdrawOpen, setWithdrawOpen] = useState(false)
    const [withdrawToken, setWithdrawToken] = useState<WithdrawToken>('SPACE')
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [withdrawing, setWithdrawing] = useState(false)
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 30_000,
    })
    const { data: logsData, isLoading: logsLoading, isError: logsIsError } = useQuery({
        queryKey: ['balance-logs', 'personal', 1, 3],
        queryFn: () => getBalanceLogs(1, 3),
        staleTime: 20_000,
    })
    const { data: latestPrice } = useQuery({
        queryKey: ['market', 'latest-price'],
        queryFn: getMarketLatestPrice,
        staleTime: 20_000,
    })
    const displayAddress = profile?.address || getLoginAddress() || address
    const avatarSvg = multiavatar(displayAddress || 'space-user', true)
    const spaceBalance = formatBigintAmount(profile?.balance)
    const usdtBalance = formatBigintAmount(profile?.usdtBalance)
    const totalAssetValue = BigInt(profile?.usdtBalance || '0') + BigInt(profile?.balance || '0') * BigInt(latestPrice?.price || '0') / 10n ** 18n
    const balanceLogs = logsData?.list ?? []
    const withdrawAmountWei = parseAmountInput(withdrawAmount)
    const withdrawBalanceWei = BigInt(withdrawToken === 'SPACE' ? profile?.balance || '0' : profile?.usdtBalance || '0')
    const isWithdrawAmountValid = withdrawAmountWei > 0n && withdrawAmountWei <= withdrawBalanceWei

    const handleLogout = () => {
        clearAccessToken()
        queryClient.clear()
        navigate('/login')
    }

    const handleCopyAddress = async () => {
        if (!displayAddress) {
            return
        }

        if (await copy(displayAddress)) {
            toast.success(t('personal.addressCopied'))
            return
        }

        toast.error(t('common.copyFailed'))
    }

    const closeWithdrawModal = () => {
        if (withdrawing) {
            return
        }

        setWithdrawOpen(false)
        setWithdrawAmount('')
        setWithdrawToken('SPACE')
    }

    const handleWithdraw = async () => {
        try {
            if (!address) {
                toast.error(t('common.connectWalletFirst'))
                return
            }

            if (!isWithdrawAmountValid) {
                toast.error(t('personal.invalidWithdrawAmount'))
                return
            }

            setWithdrawing(true)
            const signature = withdrawToken === 'SPACE'
                ? await withdraw(withdrawAmountWei.toString())
                : await withdrawUsdt(withdrawAmountWei.toString())
            const hash = await writeContract({
                address: mining.address,
                abi: mining.abi,
                functionName: withdrawToken === 'SPACE' ? 'claim' : 'withdrawUsdt',
                args: withdrawToken === 'SPACE'
                    ? [
                        BigInt(signature.amount),
                        BigInt(signature.vipFee || '0'),
                        BigInt(signature.nodeFee || '0'),
                        signature.nonce,
                        BigInt(signature.deadline),
                        signature.signature,
                    ]
                    : [
                        BigInt(signature.amount),
                        signature.nonce,
                        BigInt(signature.deadline),
                        signature.signature,
                    ],
            })

            await waitForTransactionReceipt(wagmiConfig, {
                hash,
            })
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['profile'] }),
                queryClient.invalidateQueries({ queryKey: ['balance-logs'] }),
            ])
            toast.success(t('personal.withdrawSuccess'))
            setWithdrawOpen(false)
            setWithdrawAmount('')
        } catch (error) {
            toast.error(error instanceof Error ? t(getFriendlyErrorKey(error.message, 'common.walletActionFailed')) : t('personal.withdrawFailed'))
        } finally {
            setWithdrawing(false)
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.profile_card}>
                <div className={styles.avatar} dangerouslySetInnerHTML={{ __html: avatarSvg }} />
                <div className={styles.profile_info}>
                    <button className={styles.address_btn} type="button" onClick={handleCopyAddress}>
                        {formatAddress(displayAddress)}
                    </button>
                    <div className={styles.profile_badges}>
                        <span>VIP {profile?.vipLevel ?? 0}</span>
                        <span>Node V{profile?.nodeLevel ?? 1}</span>
                    </div>
                </div>
            </div>

            <div className={styles.balance_card}>
                <div className={styles.asset_total}>
                    <div>
                        <span>{t('personal.totalAssetValue')}</span>
                        <button
                            type="button"
                            aria-label={assetVisible ? t('personal.hideAssets') : t('personal.showAssets')}
                            onClick={() => setAssetVisible((visible) => !visible)}
                        >
                            <img src={assetVisible ? VisibleIcon : InvisibleIcon} alt="" />
                        </button>
                    </div>
                    <strong>{assetVisible ? `≈ ${formatBigintAmount(totalAssetValue)} USDT` : '******'}</strong>
                </div>
                <div className={styles.token_grid}>
                    <div>
                        <img src={SpaceIcon} alt="" />
                        <div>
                            <span>SPACE</span>
                            <strong>{assetVisible ? spaceBalance : '***'}</strong>
                        </div>
                    </div>
                    <div>
                        <img src={UsdtIcon} alt="" />
                        <div>
                            <span>USDT</span>
                            <strong>{assetVisible ? usdtBalance : '***'}</strong>
                        </div>
                    </div>
                </div>
                <div className={styles.asset_action}>
                    <button className={styles.withdraw_btn} type="button" onClick={() => setWithdrawOpen(true)}>{t('personal.withdraw')}</button>
                </div>
            </div>

            <div className={styles.logs_card}>
                <div className={styles.logs_head}>
                    <span>{t('personal.balanceDetails')}</span>
                    <button type="button" onClick={() => navigate('/personal/balance-logs')}>{t('personal.viewAll')}</button>
                </div>
                <div className={styles.log_list}>
                    {logsLoading && <div className={styles.log_state}>{t('personal.balanceLogsLoading')}</div>}
                    {!logsLoading && logsIsError && <div className={styles.log_state}>{t('personal.balanceLogsFailed')}</div>}
                    {!logsLoading && !logsIsError && balanceLogs.length === 0 && <div className={styles.log_state}>{t('personal.noBalanceLogs')}</div>}
                    {balanceLogs.map((log) => (
                        <div className={styles.log_item} key={log.id}>
                            <div>
                                <span>{t(balanceLogText[log.type])}</span>
                                <em>{formatTime(log.createdAt)}</em>
                            </div>
                            <strong>{assetVisible ? `${formatBigintAmount(log.amount, { fractionDigits: 5 })} ${log.token}` : '***'}</strong>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.menu_card}>
                <button type="button" onClick={() => navigate('/personal/team')}>
                    <span>{t('personal.myTeam')}</span>
                    <em>›</em>
                </button>
                <button type="button" onClick={() => toast(t('common.comingSoon'))}>
                    <span>{t('personal.subEcosystem')}</span>
                    <em>›</em>
                </button>
                <button type="button" onClick={() => navigate('/personal/about')}>
                    <span>{t('personal.aboutUs')}</span>
                    <em>›</em>
                </button>
            </div>

            <button className={styles.logout_btn} type="button" onClick={handleLogout}>
                {t('personal.logout')}
            </button>

            <Modal
                open={withdrawOpen}
                title="personal.withdraw"
                confirmText={withdrawing ? 'personal.withdrawing' : 'personal.confirmWithdraw'}
                confirmLoading={withdrawing}
                confirmDisabled={!isWithdrawAmountValid || withdrawing}
                onCancel={closeWithdrawModal}
                onConfirm={handleWithdraw}
            >
                <div className={styles.withdraw_form}>
                    <label>
                        <span>{t('personal.selectToken')}</span>
                        <div className={styles.token_tabs}>
                            <button className={withdrawToken === 'SPACE' ? styles.token_tab_active : ''} type="button" onClick={() => setWithdrawToken('SPACE')}>SPACE</button>
                            <button className={withdrawToken === 'USDT' ? styles.token_tab_active : ''} type="button" onClick={() => setWithdrawToken('USDT')}>USDT</button>
                        </div>
                    </label>
                    <label>
                        <span>{t('personal.withdrawAmount')}</span>
                        <div className={styles.withdraw_input}>
                            <input
                                value={withdrawAmount}
                                placeholder={t('market.enterAmount')}
                                inputMode="decimal"
                                onChange={(event) => setWithdrawAmount(event.target.value)}
                            />
                            <em>{withdrawToken}</em>
                        </div>
                    </label>
                    <div className={styles.withdraw_balance}>
                        {t('common.availablePrefix')}{withdrawToken === 'SPACE' ? spaceBalance : usdtBalance} {withdrawToken}
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default PersonalPage
