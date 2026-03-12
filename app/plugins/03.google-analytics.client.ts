import {
  useAnalyticsConsent,
  type AnalyticsConsentStatus,
} from '@/composables/useAnalyticsConsent';
import { logger } from '@/utils/logger';
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}
const GTAG_SCRIPT_ID = 'tt-google-analytics';
const GA_ID_PATTERN = /^G-[A-Z0-9]{10}$/;
export default defineNuxtPlugin(() => {
  if (import.meta.env.MODE === 'test') {
    return;
  }
  const measurementId = String(useRuntimeConfig().public.googleAnalyticsMeasurementId || '').trim();
  if (!measurementId) {
    return;
  }
  if (!GA_ID_PATTERN.test(measurementId)) {
    logger.error('[Analytics] Invalid Google Analytics measurement ID format');
    return;
  }
  const router = useRouter();
  const { state } = useAnalyticsConsent();
  let hasConfiguredTracker = false;
  let scriptLoadPromise: Promise<void> | null = null;
  let syncRequestId = 0;
  const setDisabled = (value: boolean) => {
    window[`ga-disable-${measurementId}`] = value;
  };
  const loadScript = async () => {
    if (scriptLoadPromise) {
      return scriptLoadPromise;
    }
    const existingScript = document.getElementById(GTAG_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript?.dataset.loaded === 'true') {
      return Promise.resolve();
    }
    scriptLoadPromise = new Promise<void>((resolve, reject) => {
      const handleLoad = () => {
        const script = document.getElementById(GTAG_SCRIPT_ID) as HTMLScriptElement | null;
        if (script) {
          script.dataset.loaded = 'true';
        }
        resolve();
        scriptLoadPromise = null;
      };
      const handleError = () => {
        const script = document.getElementById(GTAG_SCRIPT_ID) as HTMLScriptElement | null;
        if (script?.parentNode) {
          script.parentNode.removeChild(script);
        }
        scriptLoadPromise = null;
        reject(new Error('Failed to load Google Analytics'));
      };
      if (existingScript) {
        existingScript.addEventListener('load', handleLoad, { once: true });
        existingScript.addEventListener('error', handleError, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = GTAG_SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.head.appendChild(script);
    });
    return scriptLoadPromise;
  };
  const ensureConfigured = async () => {
    if (hasConfiguredTracker) {
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      ((...args: unknown[]) => {
        window.dataLayer?.push(args);
      });
    await loadScript();
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      send_page_view: false,
      transport_type: 'beacon',
    });
    hasConfiguredTracker = true;
  };
  const trackPageView = () => {
    if (!hasConfiguredTracker || state.value.status !== 'accepted') {
      return;
    }
    const pageLocation = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    window.gtag?.('event', 'page_view', {
      page_location: pageLocation,
      page_path: `${window.location.pathname}${window.location.search}`,
      page_title: document.title,
    });
  };
  const syncAnalytics = async (status: AnalyticsConsentStatus) => {
    const requestId = ++syncRequestId;
    setDisabled(status !== 'accepted');
    if (status !== 'accepted') {
      return;
    }
    await ensureConfigured();
    if (requestId !== syncRequestId || state.value.status !== 'accepted') {
      return;
    }
    await nextTick();
    if (requestId !== syncRequestId || state.value.status !== 'accepted') {
      return;
    }
    trackPageView();
  };
  setDisabled(state.value.status !== 'accepted');
  const stopConsentWatch = watch(
    () => state.value.status,
    async (status) => {
      try {
        await syncAnalytics(status);
      } catch (error) {
        logger.error('[Analytics] Failed to update Google Analytics state', error);
      }
    },
    { immediate: true }
  );
  const removeAfterEach = router.afterEach(async () => {
    if (state.value.status !== 'accepted') {
      return;
    }
    await nextTick();
    trackPageView();
  });
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      hasConfiguredTracker = false;
      scriptLoadPromise = null;
      stopConsentWatch();
      removeAfterEach();
    });
  }
});
