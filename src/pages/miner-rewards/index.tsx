import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { getBalanceLogs, type BalanceLog, type BalanceLogType } from "../../api"
import PageHeader from "../../components/page-header"
import { formatBigintAmount } from "../../utils/format"
import { getApiErrorKey, useI18n } from "../../i18n"
import styles from "./index.module.css"

const PAGE_SIZE = 12
const REWARD_TYPES: BalanceLogType[] = ['miner_reward', 'free_miner_claim', 'team_reward']
const MINER_REWARD_TYPES: BalanceLogType[] = ['miner_reward', 'free_miner_claim']

type RewardFilter = 'all' | 'miner_reward' | 'team_reward'

const filterOptions: Array<{ labelKey: string; value: RewardFilter }> = [
    { labelKey: 'minerRewards.all', value: 'all' },
    { labelKey: 'logType.miner_reward', value: 'miner_reward' },
    { labelKey: 'logType.team_reward', value: 'team_reward' },
]

const typeLabel: Record<RewardFilter, string> = {
    all: 'minerRewards.all',
    miner_reward: 'logType.miner_reward',
    team_reward: 'logType.team_reward',
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

function getLogTitle(log: BalanceLog) {
    return log.type === 'team_reward' ? typeLabel.team_reward : typeLabel.miner_reward
}

function MinerRewardsPage() {
    const { t } = useI18n()
    const [filter, setFilter] = useState<RewardFilter>('all')
    const [page, setPage] = useState(1)
    const queryTypes = filter === 'all'
        ? REWARD_TYPES
        : filter === 'miner_reward'
            ? MINER_REWARD_TYPES
            : [filter]
    const {
        data,
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: ['balance-logs', 'miner-rewards', filter, page, PAGE_SIZE],
        queryFn: () => getBalanceLogs(page, PAGE_SIZE, queryTypes, 'SPACE'),
        placeholderData: keepPreviousData,
        staleTime: 20_000,
    })
    const logs = data?.list ?? []
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <div className={styles.page}>
            <PageHeader title="pages.minerRewards" backTo="/miner" />

            <div className={styles.tabs}>
                {filterOptions.map((option) => (
                    <button
                        className={filter === option.value ? styles.active_tab : ''}
                        type="button"
                        key={option.value}
                        onClick={() => {
                            setFilter(option.value)
                            setPage(1)
                        }}
                    >
                        {t(option.labelKey)}
                    </button>
                ))}
            </div>

            <div className={styles.list}>
                {loading && <div className={styles.status}>{t('common.loading')}</div>}
                {!loading && isError && <div className={styles.status}>{error instanceof Error ? t(getApiErrorKey(error.message)) : t('minerRewards.loadFailed')}</div>}
                {!loading && !isError && logs.length === 0 && <div className={styles.status}>{t('minerRewards.empty')}</div>}
                {!loading && !isError && logs.map((log) => (
                    <div className={styles.item} key={log.id}>
                        <div className={styles.item_top}>
                            <div>
                                <span>{t(getLogTitle(log))}</span>
                                <em>{formatTime(log.createdAt)}</em>
                            </div>
                            <strong>{formatBigintAmount(log.amount, { fractionDigits: 5 })} {log.token}</strong>
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

export default MinerRewardsPage
