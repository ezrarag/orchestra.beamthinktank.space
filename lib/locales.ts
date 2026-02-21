import en from '@/locales/en.json'

export type LocaleCopy = typeof en

export function getLocaleCopy(locale: 'en' = 'en'): LocaleCopy {
  if (locale === 'en') {
    return en
  }
  return en
}
