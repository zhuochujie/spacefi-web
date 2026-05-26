import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { getNotices } from '../../api'
import PageHeader from '../../components/page-header'
import { getApiErrorKey, useI18n } from '../../i18n'
import { getLocalizedNotice } from '../../utils/notice'
import styles from './index.module.css'

function formatTime(timestamp?: number) {
    if (!timestamp) {
        return ''
    }

    return new Date(timestamp * 1000).toLocaleDateString()
}

function NoticePage() {
    const navigate = useNavigate()
    const { language, t } = useI18n()
    const {
        data,
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: ['notices', 1, 20],
        queryFn: () => getNotices(),
        staleTime: 60_000,
    })
    const notices = data?.list ?? []

    return (
        <div className={styles.page}>
            <PageHeader title="pages.noticeList" backTo="/index" />

            {loading && <div className={styles.status}>{t('common.loading')}</div>}
            {!loading && isError && <div className={styles.status}>{error instanceof Error ? t(getApiErrorKey(error.message)) : t('notice.loadFailed')}</div>}
            {!loading && !isError && notices.length === 0 && <div className={styles.status}>{t('notice.empty')}</div>}
            {!loading && !isError && notices.map((notice) => {
                const localizedNotice = getLocalizedNotice(notice, language)

                return (
                    <div
                        className={styles.item}
                        key={notice.id}
                        onClick={() => navigate(`/notice/${notice.id}`, { state: { notice } })}
                    >
                        <div className={styles.title}>{localizedNotice.title}</div>
                        <div className={styles.content}>{localizedNotice.content}</div>
                        <div className={styles.time}>{formatTime(notice.createTime)}</div>
                    </div>
                )
            })}
        </div>
    )
}

export default NoticePage
