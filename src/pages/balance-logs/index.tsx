import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { getBalanceLogs, type BalanceLogType } from "../../api"
import PageHeader from "../../components/page-header"
import { formatBigintAmount } from "../../utils/format"
import { getApiErrorKey, useI18n } from "../../i18n"
import styles from "./index.module.css"

const PAGE_SIZE = 12

const balanceLogText: Record<BalanceLogType, string> = {
    miner_reward: 'logType.miner_reward',
    team_reward: 'logType.team_reward',
    miner_purchase: 'logType.miner_purchase',
    miner_purchase_refund: 'logType.miner_purchase_refund',
    withdraw: 'logType.withdraw',
    withdraw_refund: 'logType.withdraw_refund',
    vip_dividend: 'logType.vip_dividend',
    node_dividend: 'logType.node_dividend',
}

function formatTime(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute}`
}

function BalanceLogsPage() {
    const { t } = useI18n()
    const [page, setPage] = useState(1)
    const {
        data,
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: ['balance-logs', 'all', page, PAGE_SIZE],
        queryFn: () => getBalanceLogs(page, PAGE_SIZE),
        placeholderData: keepPreviousData,
        staleTime: 20_000,
    })
    const logs = data?.list ?? []
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <div className={styles.page}>
            <PageHeader title="pages.balanceLogs" backTo="/personal" />

            <div className={styles.list}>
                {loading && <div className={styles.status}>{t('common.loading')}</div>}
                {!loading && isError && <div className={styles.status}>{error instanceof Error ? t(getApiErrorKey(error.message)) : t('minerRewards.loadFailed')}</div>}
                {!loading && !isError && logs.length === 0 && <div className={styles.status}>{t('personal.noBalanceLogs')}</div>}
                {!loading && !isError && logs.map((log) => (
                    <div className={styles.item} key={log.id}>
                        <div className={styles.item_top}>
                            <div>
                                <span>{t(balanceLogText[log.type])}</span>
                                <em>{formatTime(log.createdAt)}</em>
                            </div>
                            <strong>{formatBigintAmount(log.amount)} {log.token}</strong>
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

export default BalanceLogsPage
