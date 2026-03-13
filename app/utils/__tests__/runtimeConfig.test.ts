import { describe, expect, it } from 'vitest';
import {
  GITHUB_IMAGE_DOMAINS,
  resolveSupabaseRuntimeConfig,
  TARKOV_IMAGE_DOMAINS,
} from '@/utils/runtimeConfig';
describe('resolveSupabaseRuntimeConfig', () => {
  it('falls back to public Supabase env values for private runtime config', () => {
    const config = resolveSupabaseRuntimeConfig({
      NUXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
      NUXT_PUBLIC_SUPABASE_URL: 'https://public.supabase.co',
    });
    expect(config.privateUrl).toBe('https://public.supabase.co');
    expect(config.privateAnonKey).toBe('public-anon-key');
    expect(config.publicUrl).toBe('https://public.supabase.co');
    expect(config.publicAnonKey).toBe('public-anon-key');
  });
  it('includes Tarkov asset hosts alongside GitHub image hosts', () => {
    expect([...GITHUB_IMAGE_DOMAINS, ...TARKOV_IMAGE_DOMAINS]).toEqual(
      expect.arrayContaining(['assets.tarkov.dev', 'avatars.githubusercontent.com', 'github.com'])
    );
  });
});
