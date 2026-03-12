import { describe, expect, it } from 'vitest';
import { shouldFallbackToDirectTokenInsert } from '@/features/settings/apiTokenErrors';
describe('shouldFallbackToDirectTokenInsert', () => {
  it('blocks direct insert fallback for policy and auth 4xx errors', () => {
    expect(shouldFallbackToDirectTokenInsert({ status: 401 })).toBe(false);
    expect(shouldFallbackToDirectTokenInsert({ status: 403 })).toBe(false);
    expect(shouldFallbackToDirectTokenInsert({ status: 429 })).toBe(false);
  });
  it('allows direct insert fallback when token creation handlers are unavailable', () => {
    expect(shouldFallbackToDirectTokenInsert({ status: 404 })).toBe(true);
    expect(shouldFallbackToDirectTokenInsert({ status: 405 })).toBe(true);
  });
  it('allows direct insert fallback for 5xx responses', () => {
    expect(shouldFallbackToDirectTokenInsert({ status: 500 })).toBe(true);
    expect(shouldFallbackToDirectTokenInsert({ status: 503 })).toBe(true);
  });
  it('allows direct insert fallback for statusless exceptions', () => {
    expect(shouldFallbackToDirectTokenInsert(new Error('Internal server error'))).toBe(true);
  });
});
