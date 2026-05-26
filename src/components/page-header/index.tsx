import { useNavigate } from "react-router"
import { useI18n } from "../../i18n"
import styles from "./index.module.css"

type PageHeaderProps = {
    title: string
    backTo?: string
}

function PageHeader({ title, backTo }: PageHeaderProps) {
    const navigate = useNavigate()
    const { t } = useI18n()

    return (
        <div className={styles.header}>
            <button type="button" onClick={() => backTo ? navigate(backTo) : navigate(-1)}>{t('common.back')}</button>
            <span>{t(title)}</span>
        </div>
    )
}

export default PageHeader
