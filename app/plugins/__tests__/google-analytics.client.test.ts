// @vitest-environment happy-dom
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { AnalyticsConsentState } from '@/composables/useAnalyticsConsent';
const runtimeConfig = {
  public: {
    googleAnalyticsMeasurementId: 'G-ABCDEF1234',
  },
};
const analyticsConsentState = ref<AnalyticsConsentState>({
  status: 'accepted',
  updatedAt: '2026-03-09T00:00:00.000Z',
});
const removeAfterEach = vi.fn();
mockNuxtImport('useRuntimeConfig', () => () => runtimeConfig);
mockNuxtImport('useRouter', () => () => ({
  afterEach: vi.fn(() => removeAfterEach),
}));
vi.mock('@/composables/useAnalyticsConsent', () => ({
  useAnalyticsConsent: () => ({
    state: analyticsConsentState,
  }),
}));
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
const expectAnalyticsInitialized = (measurementId: string) => {
  expect(window.gtag).toBeTypeOf('function');
  expect(window.dataLayer).toEqual(
    expect.arrayContaining([
      ['js', expect.any(Date)],
      [
        'config',
        measurementId,
        expect.objectContaining({
          allow_ad_personalization_signals: false,
          allow_google_signals: false,
          send_page_view: false,
          transport_type: 'beacon',
        }),
      ],
      [
        'event',
        'page_view',
        expect.objectContaining({
          page_location: expect.stringContaining(window.location.origin),
          page_path: `${window.location.pathname}${window.location.search}`,
          page_title: document.title,
        }),
      ],
    ])
  );
};
const flushAnalyticsSync = async () => {
  await flushPromises();
  await flushPromises();
};
describe('google analytics plugin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('MODE', 'development');
    window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = false;
    analyticsConsentState.value = {
      status: 'accepted',
      updatedAt: '2026-03-09T00:00:00.000Z',
    };
    runtimeConfig.public.googleAnalyticsMeasurementId = 'G-ABCDEF1234';
    document.head.innerHTML = '';
    delete window.dataLayer;
    delete window.gtag;
    delete window['ga-disable-G-ABCDEF1234'];
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.innerHTML = '';
    delete window.dataLayer;
    delete window.gtag;
    delete window['ga-disable-G-ABCDEF1234'];
  });
  it('initial successful load with consent granted', async () => {
    window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;
    const plugin = (await import('@/plugins/03.google-analytics.client')).default;
    plugin({} as Parameters<typeof plugin>[0]);
    await flushAnalyticsSync();
    const script = document.getElementById('tt-google-analytics') as HTMLScriptElement | null;
    expect(script).toBeTruthy();
    expect(script?.src).toContain(
      `googletagmanager.com/gtag/js?id=${runtimeConfig.public.googleAnalyticsMeasurementId}`
    );
    expect(script?.dataset.loaded).toBe('true');
    expectAnalyticsInitialized(runtimeConfig.public.googleAnalyticsMeasurementId);
  });
  it('consent denial before script loads', async () => {
    analyticsConsentState.value = {
      status: 'declined',
      updatedAt: '2026-03-09T00:00:00.000Z',
    };
    window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;
    const plugin = (await import('@/plugins/03.google-analytics.client')).default;
    plugin({} as Parameters<typeof plugin>[0]);
    await flushAnalyticsSync();
    expect(document.getElementById('tt-google-analytics')).toBeNull();
    analyticsConsentState.value = {
      status: 'accepted',
      updatedAt: '2026-03-09T00:01:00.000Z',
    };
    await flushAnalyticsSync();
    const script = document.getElementById('tt-google-analytics') as HTMLScriptElement | null;
    expect(script).toBeTruthy();
    expect(script?.src).toContain(
      `googletagmanager.com/gtag/js?id=${runtimeConfig.public.googleAnalyticsMeasurementId}`
    );
    expect(script?.dataset.loaded).toBe('true');
    expectAnalyticsInitialized(runtimeConfig.public.googleAnalyticsMeasurementId);
  });
  it('does not initialize analytics for an invalid measurement ID', async () => {
    runtimeConfig.public.googleAnalyticsMeasurementId = '';
    const plugin = (await import('@/plugins/03.google-analytics.client')).default;
    plugin({} as Parameters<typeof plugin>[0]);
    await flushAnalyticsSync();
    expect(document.getElementById('tt-google-analytics')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
    expect(window.gtag).toBeUndefined();
  });
  it('removes a failed script and recreates it after consent is re-accepted', async () => {
    const originalScript = document.createElement('script');
    originalScript.id = 'tt-google-analytics';
    document.head.appendChild(originalScript);
    const plugin = (await import('@/plugins/03.google-analytics.client')).default;
    plugin({} as Parameters<typeof plugin>[0]);
    await flushAnalyticsSync();
    expect(originalScript).toBeTruthy();
    originalScript.dispatchEvent(new Event('error'));
    await flushAnalyticsSync();
    expect(document.getElementById('tt-google-analytics')).toBeNull();
    window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;
    analyticsConsentState.value = {
      status: 'declined',
      updatedAt: '2026-03-09T00:01:00.000Z',
    };
    await flushAnalyticsSync();
    analyticsConsentState.value = {
      status: 'accepted',
      updatedAt: '2026-03-09T00:02:00.000Z',
    };
    await flushAnalyticsSync();
    const replacementScript = document.getElementById(
      'tt-google-analytics'
    ) as HTMLScriptElement | null;
    expect(replacementScript).toBeTruthy();
    expect(replacementScript).not.toBe(originalScript);
    expect(replacementScript?.src).toContain('googletagmanager.com/gtag/js?id=G-ABCDEF1234');
    expect(replacementScript?.dataset.loaded).toBe('true');
  });
});
