export const GITHUB_IMAGE_DOMAINS = ['avatars.githubusercontent.com', 'github.com'] as const;
export const TARKOV_IMAGE_DOMAINS = ['assets.tarkov.dev'] as const;
const resolveEnvValue = (...values: Array<string | undefined>) =>
  values.find((value) => value?.trim())?.trim() || '';
export const resolveSupabaseRuntimeConfig = (env: NodeJS.ProcessEnv) => {
  return {
    privateAnonKey: resolveEnvValue(
      env.NUXT_SUPABASE_ANON_KEY,
      env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      env.SUPABASE_ANON_KEY,
      env.VITE_SUPABASE_ANON_KEY
    ),
    privateUrl: resolveEnvValue(
      env.NUXT_SUPABASE_URL,
      env.NUXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_URL,
      env.VITE_SUPABASE_URL
    ),
    publicAnonKey: resolveEnvValue(
      env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      env.NUXT_SUPABASE_ANON_KEY,
      env.SUPABASE_ANON_KEY,
      env.VITE_SUPABASE_ANON_KEY
    ),
    publicUrl: resolveEnvValue(
      env.NUXT_PUBLIC_SUPABASE_URL,
      env.NUXT_SUPABASE_URL,
      env.SUPABASE_URL,
      env.VITE_SUPABASE_URL
    ),
  };
};
