import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import LoadingLabel from '../loading-label'
import styles from './index.module.css'

type ModalProps = {
    open: boolean
    title: string
    confirmText?: string
    cancelText?: string
    confirmDisabled?: boolean
    confirmLoading?: boolean
    showCancel?: boolean
    children: ReactNode
    onConfirm: () => void
    onCancel: () => void
}

function Modal({
    open,
    title,
    confirmText = 'common.confirm',
    cancelText = 'common.cancel',
    confirmDisabled = false,
    confirmLoading = false,
    showCancel = true,
    children,
    onConfirm,
    onCancel,
}: ModalProps) {
    const { t } = useI18n()

    if (!open) {
        return null
    }

    return (
        <div className={styles.mask}>
            <div className={styles.modal}>
                <div className={styles.title}>{t(title)}</div>
                <div className={styles.content}>{children}</div>
                <div className={styles.actions}>
                    {showCancel && <button className={styles.cancel} onClick={onCancel}>{t(cancelText)}</button>}
                    <button className={styles.confirm} disabled={confirmDisabled} onClick={onConfirm}>
                        {confirmLoading ? <LoadingLabel text={t(confirmText)} /> : t(confirmText)}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Modal
