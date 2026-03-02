import { useMetadataStore } from '@/stores/useMetadata';
import { useTarkovStore } from '@/stores/useTarkov';
import { normalizeStoryObjectives, orderedStoryObjectives } from '@/utils/storylineObjectives';
import type { ComputedRef } from '#imports';
import type { StoryObjective, StoryRewards } from '@/types/tarkov';
export interface StorylineLinkEntry {
  id: string;
  name: string;
}
export interface StorylineChapterView {
  id: string;
  name: string;
  normalizedName: string;
  order: number;
  autoStart: boolean;
  complete: boolean;
  wikiLink: string;
  description?: string | null;
  notes?: string | null;
  rewards?: StoryRewards | null;
  requirements: StorylineLinkEntry[];
  mapUnlocks: StorylineLinkEntry[];
  traderUnlocks: StorylineLinkEntry[];
  objectives: StoryObjective[];
  objectiveMap: Record<string, StoryObjective>;
}
export interface StorylineRequirementView {
  id: string;
  label: string;
}
export interface StorylineObjectiveRouteView {
  id: string;
  label: string;
  complete: boolean;
}
export interface StorylineRouteChoiceGroup {
  chosenObjectiveId: string | null;
  id: string;
  objectives: StorylineObjectiveProgress[];
}
export interface StorylineObjectiveProgress extends StoryObjective {
  complete: boolean;
  routeAlternatives: StorylineObjectiveRouteView[];
  routeBlockingAlternatives: StorylineObjectiveRouteView[];
  routeState: 'open' | 'chosen' | 'blocked';
}
export interface StorylineNormalizedChapterView extends Omit<
  StorylineChapterView,
  'objectives' | 'requirements'
> {
  mainObjectiveCompleted: number;
  mainObjectiveTotal: number;
  mainObjectives: StorylineObjectiveProgress[];
  mainLinearObjectives: StorylineObjectiveProgress[];
  mainRouteChoices: StorylineRouteChoiceGroup[];
  objectives: StorylineObjectiveProgress[];
  optionalObjectives: StorylineObjectiveProgress[];
  optionalLinearObjectives: StorylineObjectiveProgress[];
  optionalRouteChoices: StorylineRouteChoiceGroup[];
  requirements: StorylineRequirementView[];
}
interface UseStorylineChaptersOptions {
  isChapterComplete?: (chapterId: string) => boolean;
  isObjectiveComplete?: (chapterId: string, objectiveId: string) => boolean;
}
const normalizeChapterRequirements = (
  chapter: StorylineChapterView
): StorylineRequirementView[] => {
  const rawRequirements = chapter.requirements as Array<
    string | { description?: string; id?: string; name?: string }
  >;
  return rawRequirements
    .map((rawRequirement, index) => {
      if (typeof rawRequirement === 'string') {
        const label = rawRequirement.trim();
        if (!label) {
          return null;
        }
        return {
          id: `${chapter.id}-requirement-${index}`,
          label,
        };
      }
      const label = rawRequirement.name?.trim() || rawRequirement.description?.trim();
      if (!label) {
        return null;
      }
      return {
        id: rawRequirement.id?.trim() || `${chapter.id}-requirement-${index}`,
        label,
      };
    })
    .filter((requirement): requirement is StorylineRequirementView => Boolean(requirement));
};
const buildRouteChoiceGroups = (
  objectives: StorylineObjectiveProgress[]
): {
  linearObjectives: StorylineObjectiveProgress[];
  routeChoiceGroups: StorylineRouteChoiceGroup[];
} => {
  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));
  const groupedObjectiveIds = new Set<string>();
  const visited = new Set<string>();
  const routeChoiceGroups: StorylineRouteChoiceGroup[] = [];
  for (const objective of objectives) {
    if (visited.has(objective.id)) {
      continue;
    }
    const linkedIds = objective.mutuallyExclusiveWith ?? [];
    if (linkedIds.length === 0) {
      continue;
    }
    const stack = [objective.id];
    const componentIds = new Set<string>();
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (componentIds.has(currentId)) {
        continue;
      }
      componentIds.add(currentId);
      visited.add(currentId);
      const currentObjective = objectiveById.get(currentId);
      if (!currentObjective) {
        continue;
      }
      for (const nextId of currentObjective.mutuallyExclusiveWith ?? []) {
        if (objectiveById.has(nextId) && !componentIds.has(nextId)) {
          stack.push(nextId);
        }
      }
    }
    if (componentIds.size < 2) {
      continue;
    }
    const groupedObjectives = Array.from(componentIds)
      .map((objectiveId) => objectiveById.get(objectiveId))
      .filter((value): value is StorylineObjectiveProgress => Boolean(value))
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }
        return left.id.localeCompare(right.id);
      });
    if (groupedObjectives.length < 2) {
      continue;
    }
    groupedObjectives.forEach((groupedObjective) => {
      groupedObjectiveIds.add(groupedObjective.id);
    });
    routeChoiceGroups.push({
      chosenObjectiveId:
        groupedObjectives.find((groupedObjective) => groupedObjective.complete)?.id ?? null,
      id: `${groupedObjectives[0]!.id}-route-choice`,
      objectives: groupedObjectives,
    });
  }
  routeChoiceGroups.sort((left, right) => {
    const leftOrder = Math.min(...left.objectives.map((objective) => objective.order));
    const rightOrder = Math.min(...right.objectives.map((objective) => objective.order));
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.id.localeCompare(right.id);
  });
  const linearObjectives = objectives.filter((objective) => !groupedObjectiveIds.has(objective.id));
  return {
    linearObjectives,
    routeChoiceGroups,
  };
};
export function useStorylineChapters(options: UseStorylineChaptersOptions = {}): {
  chapters: ComputedRef<StorylineChapterView[]>;
  normalizedChapters: ComputedRef<StorylineNormalizedChapterView[]>;
} {
  const metadataStore = useMetadataStore();
  const tarkovStore = useTarkovStore();
  const isChapterComplete = options.isChapterComplete ?? tarkovStore.isStoryChapterComplete;
  const isObjectiveComplete = options.isObjectiveComplete ?? tarkovStore.isStoryObjectiveComplete;
  const chapters = computed<StorylineChapterView[]>(() => {
    return (metadataStore.storyChapters ?? []).map((chapter) => {
      const objectiveMap = normalizeStoryObjectives(chapter.objectives);
      return {
        id: chapter.id,
        name: chapter.name || chapter.id,
        normalizedName: chapter.normalizedName,
        order: chapter.order,
        autoStart: chapter.autoStart ?? false,
        complete: isChapterComplete(chapter.id),
        wikiLink: chapter.wikiLink,
        description: chapter.description,
        notes: chapter.notes,
        rewards: chapter.rewards,
        requirements: chapter.chapterRequirements ?? [],
        mapUnlocks: chapter.mapUnlocks ?? [],
        traderUnlocks: chapter.traderUnlocks ?? [],
        objectives: orderedStoryObjectives(objectiveMap),
        objectiveMap,
      };
    });
  });
  const normalizedChapters = computed<StorylineNormalizedChapterView[]>(() => {
    return chapters.value.map((chapter) => {
      const objectiveProgress = chapter.objectives.map((objective) => ({
        ...objective,
        complete: isObjectiveComplete(chapter.id, objective.id),
      }));
      const objectiveCompleteMap = new Map(
        objectiveProgress.map((objective) => [objective.id, objective.complete])
      );
      const objectives: StorylineObjectiveProgress[] = objectiveProgress.map((objective) => {
        const routeAlternatives: StorylineObjectiveRouteView[] = (
          objective.mutuallyExclusiveWith ?? []
        )
          .map((linkedId) => {
            const linkedObjective = chapter.objectiveMap[linkedId];
            if (!linkedObjective) {
              return null;
            }
            return {
              id: linkedId,
              label: linkedObjective.description,
              complete: objectiveCompleteMap.get(linkedId) === true,
            };
          })
          .filter((linkedObjective): linkedObjective is StorylineObjectiveRouteView =>
            Boolean(linkedObjective)
          );
        const routeBlockingAlternatives = routeAlternatives.filter(
          (linkedObjective) => linkedObjective.complete
        );
        const routeState: StorylineObjectiveProgress['routeState'] = objective.complete
          ? 'chosen'
          : routeBlockingAlternatives.length > 0
            ? 'blocked'
            : 'open';
        return {
          ...objective,
          routeAlternatives,
          routeBlockingAlternatives,
          routeState,
        };
      });
      const mainObjectives = objectives.filter((objective) => objective.type === 'main');
      const optionalObjectives = objectives.filter((objective) => objective.type === 'optional');
      const { linearObjectives: mainLinearObjectives, routeChoiceGroups: mainRouteChoices } =
        buildRouteChoiceGroups(mainObjectives);
      const {
        linearObjectives: optionalLinearObjectives,
        routeChoiceGroups: optionalRouteChoices,
      } = buildRouteChoiceGroups(optionalObjectives);
      return {
        ...chapter,
        mainObjectiveCompleted: mainObjectives.filter((objective) => objective.complete).length,
        mainObjectiveTotal: mainObjectives.length,
        mainLinearObjectives,
        mainObjectives,
        mainRouteChoices,
        objectives,
        optionalLinearObjectives,
        optionalObjectives,
        optionalRouteChoices,
        requirements: normalizeChapterRequirements(chapter),
      };
    });
  });
  return {
    chapters,
    normalizedChapters,
  };
}
