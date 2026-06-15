import { useQuery } from "@tanstack/react-query"
import copy from "copy-to-clipboard"
import { toast } from "react-hot-toast"
import { getCommissionLevel, getProfile, getTeam } from "../../api"
import PageHeader from "../../components/page-header"
import { formatBigintAmount } from "../../utils/format"
import { getApiErrorKey, useI18n } from "../../i18n"
import styles from "./index.module.css"

function formatAddress(address: string) {
    if (!address) {
        return '--'
    }

    return `${address.slice(0, 8)}...${address.slice(-6)}`
}

function formatTime(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function TeamPage() {
    const { t } = useI18n()
    const {
        data,
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: ['account', 'team'],
        queryFn: getTeam,
        staleTime: 30_000,
    })
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 30_000,
    })
    const { data: commissionLevel } = useQuery({
        queryKey: ['account', 'commission-level'],
        queryFn: getCommissionLevel,
        staleTime: 30_000,
    })
    const members = data?.directList ?? []
    const inviteLink = profile?.refCode ? `${window.location.origin}/?refCode=${profile.refCode}` : ''

    const handleCopy = async (text: string, label: string) => {
        if (!text) {
            return
        }

        if (await copy(text)) {
            toast.success(t('team.copied', { label: t(label) }))
            return
        }

        toast.error(t('common.copyFailed'))
    }

    return (
        <div className={styles.page}>
            <PageHeader title="pages.team" backTo="/personal" />

            <div className={styles.summary}>
                <div>
                    <span>{t('team.members')}</span>
                    <strong>{data?.teamCount ?? 0} {t('team.people')}</strong>
                </div>
                <div>
                    <span>{t('team.performance')}</span>
                    <strong>{formatBigintAmount(data?.totalPerformance ?? '0')} SPACE</strong>
                </div>
            </div>

            <div className={styles.commission_card}>
                {t('team.commissionLevel', { level: commissionLevel?.commissionLevel ?? 0 })}
            </div>

            <div className={styles.invite_card}>
                <div>
                    <span>{t('team.referralLink')}</span>
                    <strong>{inviteLink || '--'}</strong>
                </div>
                <button type="button" disabled={!inviteLink} onClick={() => handleCopy(inviteLink, 'team.referralLink')}>
                    {t('team.copy')}
                </button>
            </div>

            <div className={styles.section_title}>{t('team.directMembers')}</div>

            <div className={styles.list}>
                {loading && <div className={styles.status}>{t('common.loading')}</div>}
                {!loading && isError && <div className={styles.status}>{error instanceof Error ? t(getApiErrorKey(error.message)) : t('team.loadFailed')}</div>}
                {!loading && !isError && members.length === 0 && <div className={styles.status}>{t('team.empty')}</div>}
                {!loading && !isError && members.map((member) => (
                    <div className={styles.member} key={member.id}>
                        <div className={styles.member_top}>
                            <div>
                                <button type="button" onClick={() => handleCopy(member.address, 'team.address')}>
                                    {formatAddress(member.address)}
                                </button>
                                <em>{formatTime(member.createdAt)}</em>
                            </div>
                            <strong>VIP {member.vipLevel}</strong>
                        </div>
                        <div className={styles.member_grid}>
                            <div>
                                <span>{t('team.refCode')}</span>
                                <button type="button" onClick={() => handleCopy(member.refCode, 'team.refCode')}>
                                    {member.refCode}
                                </button>
                            </div>
                            <div>
                                <span>{t('team.branchPerformance')}</span>
                                <strong>{formatBigintAmount(member.performance)} SPACE</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TeamPage
