// @vitest-environment happy-dom
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
const TEST_CHAPTERS = [
  {
    id: 'chapter-1',
    name: 'Chapter 1',
    normalizedName: 'tour',
    order: 1,
    autoStart: false,
    complete: false,
    wikiLink: 'https://example.com/chapter-1',
    description: null,
    notes: null,
    rewards: null,
    requirements: [],
    mapUnlocks: [],
    traderUnlocks: [],
    objectiveMap: {
      'objective-1': {
        id: 'objective-1',
        order: 1,
        type: 'main',
        description: 'Complete main objective',
      },
    },
    objectives: [
      {
        id: 'objective-1',
        order: 1,
        type: 'main',
        description: 'Complete main objective',
        complete: false,
        routeAlternatives: [],
        routeBlockingAlternatives: [],
        routeState: 'open',
      },
    ],
    mainObjectiveCompleted: 0,
    mainObjectiveTotal: 1,
    mainRouteChoices: [],
    mainObjectives: [
      {
        id: 'objective-1',
        order: 1,
        type: 'main',
        description: 'Complete main objective',
        complete: false,
        routeAlternatives: [],
        routeBlockingAlternatives: [],
        routeState: 'open',
      },
    ],
    mainLinearObjectives: [
      {
        id: 'objective-1',
        order: 1,
        type: 'main',
        description: 'Complete main objective',
        complete: false,
        routeAlternatives: [],
        routeBlockingAlternatives: [],
        routeState: 'open',
      },
    ],
    optionalRouteChoices: [],
    optionalLinearObjectives: [],
    optionalObjectives: [],
  },
];
const cloneTestChapters = () => structuredClone(TEST_CHAPTERS);
const normalizedChapters = ref(cloneTestChapters());
vi.mock('@/composables/useStorylineChapters', () => ({
  useStorylineChapters: () => ({ normalizedChapters }),
}));
mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
}));
const createWrapper = async (readOnly: boolean) => {
  const { default: ProfileStorylineTab } =
    await import('@/features/profile/ProfileStorylineTab.vue');
  return mount(ProfileStorylineTab, {
    props: {
      storyChapterCompletionState: { 'chapter-1': false },
      storyObjectiveCompletionState: {
        'chapter-1': {
          'objective-1': false,
        },
      },
      readOnly,
    },
    global: {
      stubs: {
        UAlert: {
          template: '<div><slot /></div>',
        },
        UBadge: {
          template: '<span><slot /></span>',
        },
        UIcon: true,
      },
    },
  });
};
describe('ProfileStorylineTab', () => {
  beforeEach(() => {
    normalizedChapters.value = cloneTestChapters();
  });
  it('does not emit objective toggle events when read-only', async () => {
    const wrapper = await createWrapper(true);
    const checkbox = wrapper.get('input[type="checkbox"]');
    expect(checkbox.attributes('disabled')).toBeDefined();
    await checkbox.trigger('change');
    expect(wrapper.emitted('toggleObjective')).toBeUndefined();
    wrapper.unmount();
  });
  it('emits objective toggle events when editable', async () => {
    const wrapper = await createWrapper(false);
    const checkbox = wrapper.get('input[type="checkbox"]');
    expect(checkbox.attributes('disabled')).toBeUndefined();
    await checkbox.trigger('change');
    expect(wrapper.emitted('toggleObjective')).toEqual([['chapter-1', 'objective-1']]);
    wrapper.unmount();
  });
  it('does not emit objective toggle events when route is blocked', async () => {
    normalizedChapters.value[0].mainObjectives[0].routeState = 'blocked';
    normalizedChapters.value[0].mainObjectives[0].routeAlternatives = [
      { id: 'objective-2', label: 'Alternative objective', complete: true },
    ];
    normalizedChapters.value[0].mainObjectives[0].routeBlockingAlternatives = [
      { id: 'objective-2', label: 'Alternative objective', complete: true },
    ];
    normalizedChapters.value[0].mainLinearObjectives[0].routeState = 'blocked';
    normalizedChapters.value[0].mainLinearObjectives[0].routeAlternatives = [
      { id: 'objective-2', label: 'Alternative objective', complete: true },
    ];
    normalizedChapters.value[0].mainLinearObjectives[0].routeBlockingAlternatives = [
      { id: 'objective-2', label: 'Alternative objective', complete: true },
    ];
    const wrapper = await createWrapper(false);
    const checkbox = wrapper.get('input[type="checkbox"]');
    expect(checkbox.attributes('disabled')).toBeDefined();
    await checkbox.trigger('change');
    expect(wrapper.emitted('toggleObjective')).toBeUndefined();
    wrapper.unmount();
  });
});
