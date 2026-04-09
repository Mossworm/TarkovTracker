import { edgeCache } from '~/server/utils/edgeCache';
import { getValidatedLanguage } from '~/server/utils/language-helpers';
import { CACHE_TTL_EXTENDED } from '~/server/utils/tarkov-cache-config';
import { TARKOV_PRESTIGE_QUERY } from '~/server/utils/tarkov-queries';
import { createTarkovFetcher } from '~/server/utils/tarkovFetcher';
const PRESTIGE_CACHE_VERSION = 'v2';
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const lang = getValidatedLanguage(query);
  const cacheKey = `prestige-${PRESTIGE_CACHE_VERSION}-${lang}`;
  const fetcher = createTarkovFetcher(TARKOV_PRESTIGE_QUERY, { gameMode: 'regular', lang });
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL_EXTENDED, {
    cacheKeyPrefix: 'tarkov',
  });
});
