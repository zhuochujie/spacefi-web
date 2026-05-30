import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearchParams } from "react-router"
import { useConnection, useConnect, useConnectors, useSignMessage } from "wagmi"
import { getFriendlyErrorKey, useI18n, type AppLanguage } from "../../i18n"
import styles from "./index.module.css"
import LoginLogo from './images/compressed-login_logo.png'
import LoginMiner from './images/compressed-login_miner.png'
import { getAccountExists, getNonce, login, register, setAccessToken, setLoginAddress } from "../../api"
import Modal from "../../components/modal"
import LoadingLabel from "../../components/loading-label"

const LANGUAGE_OPTIONS: AppLanguage[] = ['en', 'th', 'ko', 'zh']

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Login failed'
}

function LoginPage() {
    const navigate = useNavigate()
    const { language, setLanguage, t } = useI18n()
    const queryClient = useQueryClient()
    const [searchParams] = useSearchParams()
    const { address } = useConnection()
    const connectors = useConnectors()
    const { mutateAsync: connect } = useConnect()
    const { mutateAsync: signWalletMessage } = useSignMessage()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [refCodeInput, setRefCodeInput] = useState('')
    const [refCodeModalOpen, setRefCodeModalOpen] = useState(false)
    const [languageOpen, setLanguageOpen] = useState(false)
    const refCodeResolver = useRef<((value: string) => void) | null>(null)

    const requestRefCode = (defaultRefCode = '') => {
        setRefCodeInput(defaultRefCode)
        setRefCodeModalOpen(true)

        return new Promise<string>((resolve) => {
            refCodeResolver.current = resolve
        })
    }

    const closeRefCodeModal = (value: string) => {
        setRefCodeModalOpen(false)
        refCodeResolver.current?.(value.trim())
        refCodeResolver.current = null
    }

    const handleLogin = async () => {
        try {
            setLoading(true)
            setMessage('')

            let walletAddress = address

            if (!walletAddress) {
                const connector = connectors[0]

                if (!connector) {
                    throw new Error(t('login.walletConnectorNotFound'))
                }

                walletAddress = (await connect({ connector })).accounts[0]
            }

            if (!walletAddress) {
                throw new Error(t('login.walletAddressNotFound'))
            }

            const normalizedAddress = walletAddress.toLowerCase()
            const account = await getAccountExists(normalizedAddress)
            const nonce = await getNonce(normalizedAddress)
            const pageSearchParams = new URLSearchParams(window.location.search)
            const refCodeFromUrl = searchParams.get('refCode')
                || searchParams.get('ref')
                || pageSearchParams.get('refCode')
                || pageSearchParams.get('ref')
                || ''
            const refCode = account.exists
                ? ''
                : await requestRefCode(refCodeFromUrl)
            const walletMessage = account.exists
                ? `Sign this message to login your account.\n\nAddress: ${normalizedAddress}\nNonce: ${nonce}`
                : `Sign this message to register your account.\n\nAddress: ${normalizedAddress}\nNonce: ${nonce}\nReferral Code: ${refCode}`

            if (!account.exists && !refCode) {
                throw new Error(t('login.referralRequired'))
            }

            const signature = await signWalletMessage({ message: walletMessage })
            const result = account.exists
                ? await login(normalizedAddress, signature)
                : await register(normalizedAddress, refCode, signature)

            queryClient.clear()
            setAccessToken(result.access_token)
            setLoginAddress(normalizedAddress)
            navigate(searchParams.get('redirect') || '/index')
        } catch (error) {
            setMessage(t(getFriendlyErrorKey(getErrorMessage(error), 'common.walletActionFailed')))
        } finally {
            setLoading(false)
        }
    }

    return ( 
        <div className={styles.con}>
            <div className={styles.language_switch}>
                <button
                    className={styles.language_trigger}
                    type="button"
                    onClick={() => setLanguageOpen((open) => !open)}
                >
                    <span>{t(`login.${language}`)}</span>
                    <em className={languageOpen ? styles.language_arrow_open : ''}>⌄</em>
                </button>
                {languageOpen && (
                    <div className={styles.language_menu}>
                        {LANGUAGE_OPTIONS.map((item) => (
                            <button
                                className={language === item ? styles.language_active : ''}
                                type="button"
                                key={item}
                                onClick={() => {
                                    setLanguage(item)
                                    setLanguageOpen(false)
                                }}
                            >
                                {t(`login.${item}`)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <img className={styles.login_logo} src={LoginLogo} alt="Login logo" />
            <div className={styles.bottom}>
                <img className={styles.login_miner} src={LoginMiner} alt="Login miner" />
                <span>{t('login.title')}</span>
                <div className={styles.liner}></div>
                <div className={styles.desc}>{t('login.desc')}</div>

                {message && <div className={styles.message}>{message}</div>}
                <button disabled={loading} onClick={handleLogin}>
                    {loading ? <LoadingLabel text={t('login.loggingIn')} /> : t('login.login')}
                </button>
            </div>
            <Modal
                open={refCodeModalOpen}
                title="login.referralTitle"
                onCancel={() => closeRefCodeModal('')}
                onConfirm={() => closeRefCodeModal(refCodeInput)}
            >
                <input
                    className={styles.ref_code_input}
                    value={refCodeInput}
                    placeholder={t('login.referralPlaceholder')}
                    onChange={(event) => setRefCodeInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            closeRefCodeModal(refCodeInput)
                        }
                    }}
                />
            </Modal>
        </div>
     );
}

export default LoginPage;
