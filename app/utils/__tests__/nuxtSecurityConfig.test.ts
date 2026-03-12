import { describe, expect, it } from 'vitest';
import {
  buildContentSecurityPolicyRouteRules,
  DEFAULT_NITRO_PRESET,
  resolveNitroPreset,
} from '@/utils/nuxtSecurityConfig';
describe('nuxtSecurityConfig', () => {
  it('uses cloudflare-pages only as the build preset fallback', () => {
    expect(resolveNitroPreset()).toBe(DEFAULT_NITRO_PRESET);
    expect(resolveNitroPreset('node-server')).toBe('node-server');
  });
  it('builds an overlay-specific CSP route rule that is stricter than the app-wide rule', () => {
    const routeRules = buildContentSecurityPolicyRouteRules({
      clientLogSinkUrl: 'https://logs.example.com/v1/collect',
      gaMeasurementId: 'G-ABCDEF1234',
      supabaseUrl: 'https://db.example.com/auth/v1',
    });
    const appCsp = routeRules['/**'].headers['Content-Security-Policy'];
    const overlayCsp = routeRules['/overlay/kappa/**'].headers['Content-Security-Policy'];
    expect(appCsp).toContain("default-src 'self'");
    expect(overlayCsp).toContain("default-src 'none'");
    expect(overlayCsp).toContain("script-src 'unsafe-inline'");
    expect(overlayCsp).toContain("frame-ancestors 'self'");
    expect(overlayCsp).not.toBe(appCsp);
  });
});
