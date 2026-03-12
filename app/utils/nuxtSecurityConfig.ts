import {
  buildAppContentSecurityPolicy,
  buildOverlayContentSecurityPolicy,
  type ContentSecurityPolicyOptions,
} from './csp';
export type AppContentSecurityPolicyOptions = Omit<
  ContentSecurityPolicyOptions,
  'allowUnsafeInlineScripts'
>;
export type RouteRule = {
  headers: Record<string, string>;
};
export const DEFAULT_NITRO_PRESET = 'cloudflare-pages';
export const resolveNitroPreset = (configuredPreset?: string): string => {
  return configuredPreset?.trim() || DEFAULT_NITRO_PRESET;
};
export const buildContentSecurityPolicyRouteRules = (
  options: AppContentSecurityPolicyOptions
): Record<'/**' | '/overlay/kappa/**', RouteRule> => {
  return {
    '/**': {
      headers: {
        'Content-Security-Policy': buildAppContentSecurityPolicy(options),
      },
    },
    '/overlay/kappa/**': {
      headers: {
        'Content-Security-Policy': buildOverlayContentSecurityPolicy({
          allowUnsafeInlineScripts: true,
        }),
      },
    },
  };
};
