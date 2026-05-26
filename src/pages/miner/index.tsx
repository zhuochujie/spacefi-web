import { useState, type CSSProperties } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { getMyMiners, type MyMiner } from "../../api"
import { formatBigintAmount } from "../../utils/format"
import { getApiErrorKey, useI18n } from "../../i18n"
import styles from "./index.module.css"
import Accelerate from './images/accelerate.png'
import Miner from './images/miner.png'
import Arrow from './images/arrow.svg'
import DetailsIcon from './images/details.svg'

const SECONDS_PER_DAY = 86400
type MinerFilter = 'all' | 'running' | 'out'

const FILTER_OPTIONS: Array<{ labelKey: string; value: MinerFilter }> = [
    { labelKey: 'miner.all', value: 'all' },
    { labelKey: 'miner.running', value: 'running' },
    { labelKey: 'miner.out', value: 'out' },
]

function getRemainingReward(miner: MyMiner) {
    const remaining = BigInt(miner.expectedReward) - BigInt(miner.producedReward)

    return remaining > 0n ? remaining : 0n
}

function formatDate(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function getCycleDays(cycle: number) {
    return Math.max(1, Math.ceil(cycle / SECONDS_PER_DAY))
}

function getElapsedDays(miner: MyMiner) {
    const totalDays = getCycleDays(miner.cycle)
    const now = Math.floor(Date.now() / 1000)
    const cycleStartAt = miner.cycleEndAt - miner.cycle
    const elapsedSeconds = Math.max(0, Math.min(now, miner.cycleEndAt) - cycleStartAt)

    return Math.min(totalDays, Math.floor(elapsedSeconds / SECONDS_PER_DAY) + 1)
}

function getProgress(miner: MyMiner) {
    const expectedReward = BigInt(miner.expectedReward)

    if (expectedReward === 0n) {
        return 0
    }

    const producedReward = BigInt(miner.producedReward)
    const progress = Number((producedReward * 100n) / expectedReward)

    return Math.min(100, Math.max(0, progress))
}

function MinerPage() {
    const navigate = useNavigate()
    const { t } = useI18n()
    const [minerFilter, setMinerFilter] = useState<MinerFilter>('all')
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const {
        data,
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: ['miners', 'my'],
        queryFn: getMyMiners,
        staleTime: 30_000,
    })
    const myMiners = data?.list ?? []
    const minerReward = data?.minerReward ?? '0'
    const teamReward = data?.teamReward ?? '0'
    const totalRemainingReward = myMiners.reduce((total, miner) => total + getRemainingReward(miner), 0n)
    const selectedFilterLabel = t(FILTER_OPTIONS.find((option) => option.value === minerFilter)?.labelKey || 'miner.all')
    const filteredMiners = myMiners.filter((miner) => {
        if (minerFilter === 'all') {
            return true
        }

        const isOut = getRemainingReward(miner) === 0n

        return minerFilter === 'out' ? isOut : !isOut
    })

    return ( 
        <div>
            <div className={styles.top}>
                <div className={styles.text_con}>
                    <div className={styles.top_title}>
                        <span>{t('miner.title')}</span>
                        <button
                            className={styles.details_btn}
                            type="button"
                            aria-label={t('miner.viewRewards')}
                            onClick={() => navigate('/miner/rewards')}
                        >
                            <img src={DetailsIcon} alt="" />
                        </button>
                    </div>
                    <span>{t('miner.subtitle')}</span>
                </div>
                <div className={styles.data_con}>
                    <span>{t('miner.myRights')}</span>
                    <div className={styles.total}>
                        <span>{formatBigintAmount(totalRemainingReward)} <span>SPACE</span></span>
                    </div>
                    <div className={styles.sub}>
                        <div>
                            <img src={Miner} alt="" />
                            <div>
                                <span>{t('miner.minerReward')}</span>
                                <span>{formatBigintAmount(minerReward)} <span>SPACE</span></span>
                            </div>
                        </div>

                        <div>
                            <img src={Accelerate} alt="" />
                            <div>
                                <span>{t('miner.teamReward')}</span>
                                <span>{formatBigintAmount(teamReward)} <span>SPACE</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.miners}>
                <div className={styles.title}>
                    <div className={styles.title_left}>
                        <div></div>
                        <span>{t('miner.myMiners')}</span>
                    </div>
                    <div className={styles.filter_wrap}>
                        <button
                            className={styles.title_right}
                            type="button"
                            onClick={() => setIsFilterOpen((open) => !open)}
                        >
                            <span>{selectedFilterLabel}</span>
                            <img className={isFilterOpen ? styles.arrow_open : ''} src={Arrow} alt="Arrow" />
                        </button>
                        {isFilterOpen && (
                            <div className={styles.filter_menu}>
                                {FILTER_OPTIONS.map((option) => (
                                    <button
                                        className={`${styles.filter_option} ${minerFilter === option.value ? styles.filter_option_active : ''}`}
                                        type="button"
                                        key={option.value}
                                        onClick={() => {
                                            setMinerFilter(option.value)
                                            setIsFilterOpen(false)
                                        }}
                                    >
                                        {t(option.labelKey)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {loading && <div className={styles.empty_miner}><div>{t('common.loading')}</div><span>{t('miner.loadingData')}</span></div>}
                {!loading && isError && <div className={styles.empty_miner}><div>{t('miner.loadFailed')}</div><span>{error instanceof Error ? t(getApiErrorKey(error.message)) : t('miner.loadFailedMessage')}</span></div>}
                {!loading && !isError && myMiners.length === 0 && (
                    <div className={styles.empty_miner}>
                        <div>{t('miner.noMiners')}</div>
                        <span>{t('miner.noMinersDesc')}</span>
                    </div>
                )}
                {!loading && !isError && myMiners.length > 0 && filteredMiners.length === 0 && (
                    <div className={styles.empty_miner}>
                        <div>{t('miner.noFiltered', { label: selectedFilterLabel })}</div>
                        <span>{t('miner.noFilteredDesc')}</span>
                    </div>
                )}
                {!loading && !isError && filteredMiners.map((item) => {
                    const progress = getProgress(item)
                    const isOut = getRemainingReward(item) === 0n
                    const totalDays = getCycleDays(item.cycle)
                    const cycleStartAt = item.cycleEndAt - item.cycle
                    const progressStyle = {
                        '--progress': `${progress}%`,
                    } as CSSProperties

                    return (
                        <div className={styles.miner} key={item.id}>
                            <img
                                src={`/miners/${item.miner.id}.png`}
                                alt={item.miner.name}
                                onError={(event) => {
                                    event.currentTarget.src = '/miner1.png'
                                }}
                            />
                            <div className={styles.miner_info}>
                                <span className={styles.miner_name}>{item.miner.name}</span>
                                <div className={styles.miner_meta}>
                                    <div>
                                        <span>{t('home.cycle')}</span>
                                        <span>{getElapsedDays(item)} / {totalDays}</span>
                                    </div>
                                    <div>
                                        <span>{t('miner.cycleTime')}</span>
                                        <span>{formatDate(cycleStartAt)} ~ {formatDate(item.cycleEndAt)}</span>
                                    </div>
                                </div>
                                <span className={styles.miner_output}>
                                    {t('miner.produced')} <span>{formatBigintAmount(item.producedReward)} SPACE</span> / {t('miner.total')} {formatBigintAmount(item.expectedReward)} SPACE
                                </span>
                            </div>
                            <div className={styles.miner_status}>
                                <div className={`${styles.status_badge} ${isOut ? styles.status_out : ''}`}>{isOut ? t('miner.out') : t('miner.statusRunning')}</div>
                                {isOut
                                    ? <button className={styles.reinvest_btn}>{t('miner.reinvest')}</button>
                                    : <div className={styles.progress} style={progressStyle}>{progress}%</div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
     );
}

export default MinerPage;
