import { useLocation, useNavigate } from "react-router";
import IndexImage from './images/index.png'
import IndexImageActive from './images/index-active.png'
import MinerImage from './images/miner.png'
import MinerImageActive from './images/miner-active.png'
import MarketImage from './images/market.png'
import MarketImageActive from './images/market-active.png'
import PersonalImage from './images/personal.png'
import PersonalImageActive from './images/personal-active.png'
import { useI18n } from "../../i18n";

import styles from "./index.module.css"

const menus = [
    {
        path: '/index',
        label: 'nav.home',
        icon: IndexImage,
        activeIcon: IndexImageActive,
    },
    {
        path: '/miner',
        label: 'nav.miner',
        icon: MinerImage,
        activeIcon: MinerImageActive,
    },
    {
        path: '/market',
        label: 'nav.market',
        icon: MarketImage,
        activeIcon: MarketImageActive,
    },
    {
        path: '/personal',
        label: 'nav.personal',
        icon: PersonalImage,
        activeIcon: PersonalImageActive,
    },
]

function BottomMenu() {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { pathname } = useLocation();
    const showMenu = menus.some((item) => item.path === pathname);

    if (!showMenu) {
        return null;
    }

    return (
        <div>
            <div className={styles.menu_con}>
                {menus.map((item) => {
                    const isActive = pathname === item.path;

                    return (
                        <div key={item.path} onClick={() => navigate(item.path)}>
                            <img src={isActive ? item.activeIcon : item.icon} alt={item.label} />
                            <span className={isActive ? styles.menu_active : ''}>{t(item.label)}</span>
                        </div>
                    )
                })}
            </div>
            <div className={styles.placeholder}></div>
        </div>
    );
}

export default BottomMenu;
