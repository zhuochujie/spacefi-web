import type { Notice } from '../api'
import type { AppLanguage } from '../i18n'

export function getLocalizedNotice(notice: Notice, language: AppLanguage) {
    if (language === 'en') {
        return {
            title: notice.englishTitle || notice.title,
            content: notice.englishContent || notice.content,
        }
    }

    if (language === 'th') {
        return {
            title: notice.thaiTitle || notice.title,
            content: notice.thaiContent || notice.content,
        }
    }

    if (language === 'ko') {
        return {
            title: notice.koreanTitle || notice.title,
            content: notice.koreanContent || notice.content,
        }
    }

    return {
        title: notice.title,
        content: notice.content,
    }
}
