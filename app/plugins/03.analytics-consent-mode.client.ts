import { useAnalyticsConsent } from '@/composables/useAnalyticsConsent';
import { logger } from '@/utils/logger';
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}
function ensureConsentApi() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
}
function getConsentPayload(status: 'unknown' | 'accepted' | 'declined') {
  return {
    ad_personalization: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    analytics_storage: status === 'accepted' ? 'granted' : 'denied',
  } as const;
}
export default defineNuxtPlugin(() => {
  if (import.meta.env.MODE === 'test') {
    return;
  }
  const runtimeConfig = useRuntimeConfig();
  const analyticsMeasurementId = String(
    runtimeConfig.public.googleAnalyticsMeasurementId || ''
  ).trim();
  const clarityProjectId = String(runtimeConfig.public.microsoftClarityProjectId || '').trim();
  if (!analyticsMeasurementId && !clarityProjectId) {
    return;
  }
  const { state } = useAnalyticsConsent();
  ensureConsentApi();
  window.gtag?.('consent', 'default', {
    ...getConsentPayload('unknown'),
    wait_for_update: 500,
  });
  const stopConsentWatch = watch(
    () => state.value.status,
    (status) => {
      try {
        ensureConsentApi();
        window.gtag?.('consent', 'update', getConsentPayload(status));
      } catch (error) {
        logger.error('[Analytics] Failed to update consent mode state', error);
      }
    },
    { immediate: true }
  );
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      stopConsentWatch();
    });
  }
});
