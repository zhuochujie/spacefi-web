import styles from './index.module.css'

type LoadingLabelProps = {
    text: string
}

function LoadingLabel({ text }: LoadingLabelProps) {
    return (
        <span className={styles.label}>
            {text}
            <span className={styles.dots} aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
            </span>
        </span>
    )
}

export default LoadingLabel
