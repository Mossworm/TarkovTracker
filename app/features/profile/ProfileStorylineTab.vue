<template>
  <div>
    <UAlert
      v-if="!chapterProgress.length"
      icon="i-mdi-book-off-outline"
      color="neutral"
      variant="soft"
      :title="t('page.profile.no_storyline')"
    />
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="chapter in chapterProgress"
        :key="chapter.id"
        class="bg-surface-900 rounded-lg border border-white/10 p-3"
      >
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center">
            <img
              :src="`/img/storyline/${chapter.normalizedName}.webp`"
              :alt="chapter.name"
              class="h-8 w-8 object-contain"
              :class="chapter.complete ? '' : 'opacity-40'"
            />
          </div>
          <div class="min-w-0 flex-1">
            <a
              :href="chapter.wikiLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-link hover:text-link-hover flex items-center gap-1 text-sm font-semibold no-underline"
            >
              <span class="truncate">{{ chapter.name }}</span>
              <UIcon
                name="i-mdi-open-in-new"
                class="text-surface-400 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
            </a>
            <div class="text-surface-400 flex items-center gap-1.5 text-xs">
              <UBadge v-if="chapter.autoStart" variant="subtle" color="info" size="xs">
                {{ t('page.profile.storyline_auto_start') }}
              </UBadge>
              <UBadge v-else variant="subtle" color="neutral" size="xs">
                {{ t('page.profile.storyline_discovered') }}
              </UBadge>
            </div>
          </div>
          <UIcon
            v-if="chapter.complete"
            name="i-mdi-check-circle"
            class="text-success-400 h-5 w-5 shrink-0"
          />
        </div>
        <div v-if="chapter.requirements.length" class="mb-1.5">
          <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
            {{ t('page.profile.storyline_requires') }}
          </div>
          <div class="text-surface-300 text-xs">
            {{ chapter.requirements.map((r) => r.label).join(', ') }}
          </div>
        </div>
        <div v-if="chapter.mapUnlocks.length" class="mb-1.5">
          <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
            {{ t('page.profile.storyline_unlocks_maps') }}
          </div>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="map in chapter.mapUnlocks"
              :key="map.id"
              variant="subtle"
              color="primary"
              size="xs"
            >
              {{ map.name }}
            </UBadge>
          </div>
        </div>
        <div v-if="chapter.traderUnlocks.length" class="mb-1.5">
          <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
            {{ t('page.profile.storyline_unlocks_traders') }}
          </div>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="trader in chapter.traderUnlocks"
              :key="trader.id"
              variant="subtle"
              color="warning"
              size="xs"
            >
              {{ trader.name }}
            </UBadge>
          </div>
        </div>
        <div v-if="chapter.description" class="mb-1.5">
          <div class="text-surface-400 text-xs">
            {{ chapter.description }}
          </div>
        </div>
        <div v-if="chapter.notes" class="mb-1.5">
          <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
            {{ t('page.profile.storyline_notes') }}
          </div>
          <div class="text-warning-400 text-xs">{{ chapter.notes }}</div>
        </div>
        <div v-if="chapter.mainObjectives.length" class="mb-1.5">
          <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
            {{ t('page.profile.storyline_objectives_main') }}
          </div>
          <div v-if="chapter.mainRouteChoices.length" class="mb-1.5 space-y-1.5">
            <div
              v-for="(routeChoice, routeIndex) in chapter.mainRouteChoices"
              :key="routeChoice.id"
              class="border-warning-700/30 bg-warning-950/10 rounded-md border p-2"
            >
              <div class="mb-1 flex items-center justify-between gap-2">
                <div class="text-warning-300 text-[11px] font-medium tracking-wider uppercase">
                  {{ t('page.storyline.route_decision', { index: routeIndex + 1 }) }}
                </div>
                <UBadge variant="subtle" color="warning" size="xs">
                  {{ t('page.storyline.route_choose_one') }}
                </UBadge>
              </div>
              <div class="grid grid-cols-1 gap-1">
                <label
                  v-for="obj in routeChoice.objectives"
                  :key="obj.id"
                  class="flex items-start gap-1.5 rounded border p-2"
                  :class="
                    obj.routeState === 'chosen'
                      ? 'border-success-700/40 bg-success-950/20'
                      : props.readOnly || obj.routeState === 'blocked'
                        ? 'border-error-700/30 bg-error-950/10 cursor-not-allowed opacity-70'
                        : 'bg-surface-900/40 cursor-pointer border-white/10 hover:bg-white/5'
                  "
                >
                  <input
                    type="checkbox"
                    :checked="obj.complete"
                    class="accent-success-500 mt-0.5 shrink-0"
                    :disabled="props.readOnly || obj.routeState === 'blocked'"
                    @change="handleObjectiveToggle(chapter.id, obj.id)"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-1">
                      <span
                        class="text-xs"
                        :class="obj.complete ? 'text-surface-500 line-through' : 'text-surface-200'"
                      >
                        {{ obj.description }}
                      </span>
                      <UBadge
                        v-if="obj.routeState === 'chosen'"
                        variant="subtle"
                        color="success"
                        size="xs"
                      >
                        {{ t('page.storyline.route_chosen') }}
                      </UBadge>
                      <UBadge
                        v-else-if="obj.routeState === 'blocked'"
                        variant="subtle"
                        color="error"
                        size="xs"
                      >
                        {{ t('page.storyline.route_blocked') }}
                      </UBadge>
                    </span>
                    <span
                      v-if="obj.routeState === 'chosen'"
                      class="text-success-300 mt-0.5 block text-[11px] leading-tight"
                    >
                      {{ t('page.storyline.route_selected_hint') }}
                    </span>
                    <span
                      v-else-if="
                        obj.routeState === 'blocked' && obj.routeBlockingAlternatives.length
                      "
                      class="text-error-300 mt-0.5 block text-[11px] leading-tight"
                    >
                      {{
                        t('page.storyline.route_blocked_by', {
                          objectives: obj.routeBlockingAlternatives
                            .map((entry) => entry.label)
                            .join(', '),
                        })
                      }}
                    </span>
                  </span>
                </label>
              </div>
              <div
                v-if="routeChoice.chosenObjectiveId"
                class="text-warning-200 mt-1 text-[11px] leading-tight"
              >
                {{ t('page.storyline.route_switch_hint') }}
              </div>
            </div>
          </div>
          <div v-if="chapter.mainLinearObjectives.length" class="mb-1">
            <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
              {{ t('page.storyline.route_required_steps') }}
            </div>
          </div>
          <div class="space-y-0.5">
            <label
              v-for="obj in chapter.mainLinearObjectives"
              :key="obj.id"
              class="flex items-start gap-1.5 rounded px-1 py-0.5"
              :class="
                props.readOnly || obj.routeState === 'blocked'
                  ? 'cursor-not-allowed opacity-70'
                  : 'cursor-pointer hover:bg-white/5'
              "
            >
              <input
                type="checkbox"
                :checked="obj.complete"
                class="accent-success-500 mt-0.5 shrink-0"
                :disabled="props.readOnly || obj.routeState === 'blocked'"
                @change="handleObjectiveToggle(chapter.id, obj.id)"
              />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-1">
                  <span
                    class="text-xs"
                    :class="obj.complete ? 'text-surface-500 line-through' : 'text-surface-300'"
                  >
                    {{ obj.description }}
                  </span>
                  <UBadge
                    v-if="obj.routeState === 'chosen'"
                    variant="subtle"
                    color="success"
                    size="xs"
                  >
                    {{ t('page.storyline.route_chosen') }}
                  </UBadge>
                  <UBadge
                    v-else-if="obj.routeState === 'blocked'"
                    variant="subtle"
                    color="error"
                    size="xs"
                  >
                    {{ t('page.storyline.route_blocked') }}
                  </UBadge>
                  <UBadge
                    v-else-if="obj.routeAlternatives.length"
                    variant="subtle"
                    color="warning"
                    size="xs"
                  >
                    {{ t('page.storyline.route_choice') }}
                  </UBadge>
                </span>
                <span
                  v-if="obj.routeState === 'blocked' && obj.routeBlockingAlternatives.length"
                  class="text-error-300 mt-0.5 block text-[11px] leading-tight"
                >
                  {{
                    t('page.storyline.route_blocked_by', {
                      objectives: obj.routeBlockingAlternatives
                        .map((entry) => entry.label)
                        .join(', '),
                    })
                  }}
                </span>
                <span
                  v-else-if="obj.routeAlternatives.length"
                  class="text-surface-500 mt-0.5 block text-[11px] leading-tight"
                >
                  {{
                    t('page.storyline.route_blocks', {
                      objectives: obj.routeAlternatives.map((entry) => entry.label).join(', '),
                    })
                  }}
                </span>
              </span>
            </label>
          </div>
        </div>
        <div v-if="chapter.optionalObjectives.length" class="mb-1.5">
          <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
            {{ t('page.profile.storyline_objectives_optional') }}
          </div>
          <div v-if="chapter.optionalRouteChoices.length" class="mb-1.5 space-y-1.5">
            <div
              v-for="(routeChoice, routeIndex) in chapter.optionalRouteChoices"
              :key="routeChoice.id"
              class="border-info-700/30 bg-info-950/10 rounded-md border p-2"
            >
              <div class="mb-1 flex items-center justify-between gap-2">
                <div class="text-info-300 text-[11px] font-medium tracking-wider uppercase">
                  {{ t('page.storyline.route_decision', { index: routeIndex + 1 }) }}
                </div>
                <UBadge variant="subtle" color="info" size="xs">
                  {{ t('page.storyline.route_choose_one') }}
                </UBadge>
              </div>
              <div class="grid grid-cols-1 gap-1">
                <label
                  v-for="obj in routeChoice.objectives"
                  :key="obj.id"
                  class="flex items-start gap-1.5 rounded border p-2"
                  :class="
                    obj.routeState === 'chosen'
                      ? 'border-success-700/40 bg-success-950/20'
                      : props.readOnly || obj.routeState === 'blocked'
                        ? 'border-error-700/30 bg-error-950/10 cursor-not-allowed opacity-70'
                        : 'bg-surface-900/40 cursor-pointer border-white/10 hover:bg-white/5'
                  "
                >
                  <input
                    type="checkbox"
                    :checked="obj.complete"
                    class="accent-info-500 mt-0.5 shrink-0"
                    :disabled="props.readOnly || obj.routeState === 'blocked'"
                    @change="handleObjectiveToggle(chapter.id, obj.id)"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-1">
                      <span
                        class="text-xs"
                        :class="obj.complete ? 'text-surface-500 line-through' : 'text-surface-200'"
                      >
                        {{ obj.description }}
                      </span>
                      <UBadge
                        v-if="obj.routeState === 'chosen'"
                        variant="subtle"
                        color="success"
                        size="xs"
                      >
                        {{ t('page.storyline.route_chosen') }}
                      </UBadge>
                      <UBadge
                        v-else-if="obj.routeState === 'blocked'"
                        variant="subtle"
                        color="error"
                        size="xs"
                      >
                        {{ t('page.storyline.route_blocked') }}
                      </UBadge>
                    </span>
                    <span
                      v-if="obj.routeState === 'chosen'"
                      class="text-success-300 mt-0.5 block text-[11px] leading-tight"
                    >
                      {{ t('page.storyline.route_selected_hint') }}
                    </span>
                    <span
                      v-else-if="
                        obj.routeState === 'blocked' && obj.routeBlockingAlternatives.length
                      "
                      class="text-error-300 mt-0.5 block text-[11px] leading-tight"
                    >
                      {{
                        t('page.storyline.route_blocked_by', {
                          objectives: obj.routeBlockingAlternatives
                            .map((entry) => entry.label)
                            .join(', '),
                        })
                      }}
                    </span>
                  </span>
                </label>
              </div>
              <div
                v-if="routeChoice.chosenObjectiveId"
                class="text-info-200 mt-1 text-[11px] leading-tight"
              >
                {{ t('page.storyline.route_switch_hint') }}
              </div>
            </div>
          </div>
          <div v-if="chapter.optionalLinearObjectives.length" class="mb-1">
            <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
              {{ t('page.storyline.route_optional_steps') }}
            </div>
          </div>
          <div class="space-y-0.5">
            <label
              v-for="obj in chapter.optionalLinearObjectives"
              :key="obj.id"
              class="flex items-start gap-1.5 rounded px-1 py-0.5"
              :class="
                props.readOnly || obj.routeState === 'blocked'
                  ? 'cursor-not-allowed opacity-70'
                  : 'cursor-pointer hover:bg-white/5'
              "
            >
              <input
                type="checkbox"
                :checked="obj.complete"
                class="accent-info-500 mt-0.5 shrink-0"
                :disabled="props.readOnly || obj.routeState === 'blocked'"
                @change="handleObjectiveToggle(chapter.id, obj.id)"
              />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-1">
                  <span
                    class="text-xs"
                    :class="obj.complete ? 'text-surface-500 line-through' : 'text-surface-300'"
                  >
                    {{ obj.description }}
                  </span>
                  <UBadge
                    v-if="obj.routeState === 'chosen'"
                    variant="subtle"
                    color="success"
                    size="xs"
                  >
                    {{ t('page.storyline.route_chosen') }}
                  </UBadge>
                  <UBadge
                    v-else-if="obj.routeState === 'blocked'"
                    variant="subtle"
                    color="error"
                    size="xs"
                  >
                    {{ t('page.storyline.route_blocked') }}
                  </UBadge>
                  <UBadge
                    v-else-if="obj.routeAlternatives.length"
                    variant="subtle"
                    color="warning"
                    size="xs"
                  >
                    {{ t('page.storyline.route_choice') }}
                  </UBadge>
                </span>
                <span
                  v-if="obj.routeState === 'blocked' && obj.routeBlockingAlternatives.length"
                  class="text-error-300 mt-0.5 block text-[11px] leading-tight"
                >
                  {{
                    t('page.storyline.route_blocked_by', {
                      objectives: obj.routeBlockingAlternatives
                        .map((entry) => entry.label)
                        .join(', '),
                    })
                  }}
                </span>
                <span
                  v-else-if="obj.routeAlternatives.length"
                  class="text-surface-500 mt-0.5 block text-[11px] leading-tight"
                >
                  {{
                    t('page.storyline.route_blocks', {
                      objectives: obj.routeAlternatives.map((entry) => entry.label).join(', '),
                    })
                  }}
                </span>
              </span>
            </label>
          </div>
        </div>
        <div v-if="chapter.rewards" class="mb-1.5">
          <div class="text-surface-500 mb-0.5 text-[11px] font-medium tracking-wider uppercase">
            {{ t('page.profile.storyline_rewards') }}
          </div>
          <div class="text-surface-300 text-xs">{{ chapter.rewards.description }}</div>
        </div>
        <div class="bg-surface-800/60 mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            class="h-full rounded-full transition-[width] duration-300"
            :class="
              chapter.complete
                ? 'bg-success-500/70'
                : chapter.mainProgress > 0
                  ? 'bg-primary-500/70'
                  : 'bg-surface-700'
            "
            :style="{
              width:
                chapter.mainTotal > 0
                  ? `${(chapter.mainProgress / chapter.mainTotal) * 100}%`
                  : chapter.complete
                    ? '100%'
                    : '0%',
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import {
    useStorylineChapters,
    type StorylineNormalizedChapterView,
  } from '@/composables/useStorylineChapters';
  interface Props {
    storyChapterCompletionState: Record<string, boolean>;
    storyObjectiveCompletionState: Record<string, Record<string, boolean>>;
    readOnly?: boolean;
  }
  const props = defineProps<Props>();
  const emit = defineEmits<{
    toggleObjective: [chapterId: string, objectiveId: string];
  }>();
  const { t } = useI18n({ useScope: 'global' });
  const { normalizedChapters } = useStorylineChapters({
    isChapterComplete: (chapterId: string) => props.storyChapterCompletionState[chapterId] === true,
    isObjectiveComplete: (chapterId: string, objectiveId: string) =>
      props.storyObjectiveCompletionState[chapterId]?.[objectiveId] === true,
  });
  interface ChapterProgress extends StorylineNormalizedChapterView {
    mainProgress: number;
    mainTotal: number;
  }
  const chapterProgress = computed<ChapterProgress[]>(() => {
    return normalizedChapters.value.map((chapter) => {
      return {
        ...chapter,
        mainProgress: chapter.mainObjectiveCompleted,
        mainTotal: chapter.mainObjectiveTotal,
      };
    });
  });
  const handleObjectiveToggle = (chapterId: string, objectiveId: string) => {
    if (props.readOnly) {
      return;
    }
    emit('toggleObjective', chapterId, objectiveId);
  };
</script>
