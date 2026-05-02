import { edgeCache, shouldBypassCache } from '~/server/utils/edgeCache';
import { getValidatedLanguage } from '~/server/utils/language-helpers';
import { createLogger } from '~/server/utils/logger';
import { applyOverlay } from '~/server/utils/overlay';
import { CACHE_TTL_DEFAULT, validateGameMode } from '~/server/utils/tarkov-cache-config';
import { createTarkovJsonTaskObjectivesFetcher } from '~/server/utils/tarkov-json';
const logger = createLogger('TarkovTaskObjectives');
const TASK_OBJECTIVES_CACHE_VERSION = 'json-v1';
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const bypassCache = shouldBypassCache(event);
  const lang = getValidatedLanguage(query);
  const gameMode = validateGameMode(query.gameMode);
  const cacheKey = `tasks-objectives-${TASK_OBJECTIVES_CACHE_VERSION}-${lang}-${gameMode}`;
  const baseFetcher = createTarkovJsonTaskObjectivesFetcher({ gameMode, lang });
  const fetcher = async () => {
    try {
      return await applyOverlay(await baseFetcher(), { bypassCache, gameMode });
    } catch (overlayError) {
      logger.error('Failed to apply overlay:', overlayError);
      throw overlayError;
    }
  };
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL_DEFAULT, { cacheKeyPrefix: 'tarkov' });
});
