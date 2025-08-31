import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Use the provided locale, fallback to 'en'
  const selectedLocale = locale || 'en';
  return {
    locale: selectedLocale,
    messages: (await import(`../locales/${selectedLocale}.json`)).default
  };
}); 