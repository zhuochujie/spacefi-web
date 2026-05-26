import PageHeader from "../../components/page-header"
import { useI18n } from "../../i18n"
import styles from "./index.module.css"
import LogoImage from "../index/images/logo.png"
import HeroImage from "../index/images/bg.png"
import SafetyImage from "../index/images/safety_bb.png"
import EfficientImage from "../index/images/efficient_bb.png"
import TransparentImage from "../index/images/transparent_bb.png"

const features = [
    {
        titleKey: 'about.secureTitle',
        descKey: 'about.secureDesc',
        image: SafetyImage,
    },
    {
        titleKey: 'about.efficientTitle',
        descKey: 'about.efficientDesc',
        image: EfficientImage,
    },
    {
        titleKey: 'about.openTitle',
        descKey: 'about.openDesc',
        image: TransparentImage,
    },
]

function AboutPage() {
    const { t } = useI18n()

    return (
        <div className={styles.page}>
            <PageHeader title="pages.about" backTo="/personal" />

            <section className={styles.hero}>
                <img className={styles.hero_bg} src={HeroImage} alt="" />
                <div className={styles.hero_content}>
                    <img className={styles.logo} src={LogoImage} alt="SPACE" />
                    <p>{t('about.heroDesc')}</p>
                </div>
            </section>

            <section className={styles.intro}>
                <h2>{t('about.introTitle')}</h2>
                <p>{t('about.introDesc')}</p>
            </section>

            <div className={styles.feature_list}>
                {features.map((feature) => (
                    <section className={styles.feature} key={feature.titleKey}>
                        <img src={feature.image} alt="" />
                        <div>
                            <h3>{t(feature.titleKey)}</h3>
                            <p>{t(feature.descKey)}</p>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}

export default AboutPage
