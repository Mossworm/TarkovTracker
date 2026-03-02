import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoryChapter } from '@/types/tarkov';
const objectiveCompletionState = new Set<string>();
const chapterCompletionState = new Set<string>();
const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'chapter-1',
    name: 'Chapter 1',
    normalizedName: 'chapter-1',
    wikiLink: 'https://example.com/chapter-1',
    order: 1,
    autoStart: false,
    chapterRequirements: [{ id: 'req-1', name: 'Finish Intro' }],
    objectives: {
      'obj-a': {
        id: 'obj-a',
        order: 1,
        type: 'main',
        description: 'Route A Objective',
        mutuallyExclusiveWith: ['obj-b'],
      },
      'obj-b': {
        id: 'obj-b',
        order: 2,
        type: 'main',
        description: 'Route B Objective',
        mutuallyExclusiveWith: ['obj-a'],
      },
      'obj-c': {
        id: 'obj-c',
        order: 3,
        type: 'optional',
        description: 'Side Objective',
      },
      'obj-d': {
        id: 'obj-d',
        order: 4,
        type: 'optional',
        description: 'Unknown Link Objective',
        mutuallyExclusiveWith: ['missing-objective'],
      },
    },
  },
];
const loadComposable = async () => {
  vi.resetModules();
  vi.doMock('@/stores/useMetadata', () => ({
    useMetadataStore: () => ({
      storyChapters: STORY_CHAPTERS,
    }),
  }));
  vi.doMock('@/stores/useTarkov', () => ({
    useTarkovStore: () => ({
      isStoryChapterComplete: (chapterId: string) => chapterCompletionState.has(chapterId),
      isStoryObjectiveComplete: (chapterId: string, objectiveId: string) =>
        objectiveCompletionState.has(`${chapterId}:${objectiveId}`),
    }),
  }));
  const { useStorylineChapters } = await import('@/composables/useStorylineChapters');
  return useStorylineChapters();
};
describe('useStorylineChapters', () => {
  beforeEach(() => {
    objectiveCompletionState.clear();
    chapterCompletionState.clear();
  });
  it('derives chosen, blocked, and open storyline route states', async () => {
    objectiveCompletionState.add('chapter-1:obj-b');
    const { normalizedChapters } = await loadComposable();
    const chapter = normalizedChapters.value[0];
    expect(chapter.requirements).toEqual([{ id: 'req-1', label: 'Finish Intro' }]);
    const objectiveA = chapter.objectives.find((objective) => objective.id === 'obj-a');
    const objectiveB = chapter.objectives.find((objective) => objective.id === 'obj-b');
    const objectiveC = chapter.objectives.find((objective) => objective.id === 'obj-c');
    expect(objectiveA?.routeState).toBe('blocked');
    expect(objectiveA?.routeAlternatives).toEqual([
      { id: 'obj-b', label: 'Route B Objective', complete: true },
    ]);
    expect(objectiveA?.routeBlockingAlternatives).toEqual([
      { id: 'obj-b', label: 'Route B Objective', complete: true },
    ]);
    expect(objectiveB?.routeState).toBe('chosen');
    expect(objectiveC?.routeState).toBe('open');
    expect(chapter.mainObjectiveCompleted).toBe(1);
    expect(chapter.mainObjectiveTotal).toBe(2);
    expect(chapter.mainRouteChoices).toHaveLength(1);
    expect(chapter.mainRouteChoices[0]?.objectives.map((objective) => objective.id)).toEqual([
      'obj-a',
      'obj-b',
    ]);
    expect(chapter.mainLinearObjectives).toEqual([]);
    expect(chapter.optionalRouteChoices).toEqual([]);
    expect(chapter.optionalLinearObjectives.map((objective) => objective.id)).toEqual([
      'obj-c',
      'obj-d',
    ]);
  });
  it('ignores missing mutually exclusive links when deriving route alternatives', async () => {
    const { normalizedChapters } = await loadComposable();
    const chapter = normalizedChapters.value[0];
    const objectiveD = chapter.objectives.find((objective) => objective.id === 'obj-d');
    expect(objectiveD?.routeAlternatives).toEqual([]);
    expect(objectiveD?.routeBlockingAlternatives).toEqual([]);
    expect(objectiveD?.routeState).toBe('open');
  });
});
