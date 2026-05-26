import { useQuery } from '@tanstack/react-query'
import { useLocation, useParams } from 'react-router'
import { getNotices, type Notice } from '../../api'
import PageHeader from '../../components/page-header'
import { getApiErrorKey, useI18n } from '../../i18n'
import { getLocalizedNotice } from '../../utils/notice'
import styles from './index.module.css'

function formatTime(timestamp?: number) {
    if (!timestamp) {
        return ''
    }

    return new Date(timestamp * 1000).toLocaleString()
}

function NoticeDetailPage() {
    const { language, t } = useI18n()
    const location = useLocation()
    const { id } = useParams()
    const stateNotice = (location.state as { notice?: Notice } | null)?.notice
    const {
        data,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ['notices', 1, 100],
        queryFn: () => getNotices(1, 100),
        enabled: Boolean(id) && !stateNotice,
        staleTime: 60_000,
    })
    const notice = stateNotice || data?.list.find((item) => String(item.id) === id) || null
    const loading = !stateNotice && isLoading
    const errorMessageKey = !id
        ? 'notice.notFound'
        : isError
            ? (error instanceof Error ? getApiErrorKey(error.message) : 'notice.loadFailed')
            : !loading && !notice
                ? 'notice.notFound'
                : ''
    const localizedNotice = notice ? getLocalizedNotice(notice, language) : null

    return (
        <div className={styles.page}>
            <PageHeader title="pages.noticeDetail" backTo="/notice" />

            {loading && <div className={styles.status}>{t('common.loading')}</div>}
            {!loading && errorMessageKey && <div className={styles.status}>{t(errorMessageKey)}</div>}
            {!loading && !errorMessageKey && notice && localizedNotice && (
                <article className={styles.article}>
                    <h1>{localizedNotice.title}</h1>
                    <div className={styles.time}>{formatTime(notice.createTime)}</div>
                    <div className={styles.content}>{localizedNotice.content}</div>
                </article>
            )}
        </div>
    )
}

export default NoticeDetailPage
