import type { EntityManager } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import { StoryDependencyEntity } from "#src/story-dependency/story-dependency.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import type { StoryDependencyType } from "#src/types.js";
import { canReach } from "#src/story-dependency/cycle-detection.js";

export class SelfDependencyError extends Error {
  public constructor() {
    super("A story cannot depend on itself");
    this.name = "SelfDependencyError";
  }
}

export class StoryNotFoundError extends Error {
  public constructor(public storyId: string) {
    super(`Story ${storyId} not found`);
    this.name = "StoryNotFoundError";
  }
}

export class CrossProjectDependencyError extends Error {
  public constructor() {
    super("Stories belong to different projects");
    this.name = "CrossProjectDependencyError";
  }
}

export class DuplicateDependencyError extends Error {
  public constructor() {
    super("Dependency already exists");
    this.name = "DuplicateDependencyError";
  }
}

export class CycleDetectedError extends Error {
  public constructor() {
    super("Adding this blocking dependency would create a cycle");
    this.name = "CycleDetectedError";
  }
}

export class StoryDependencyService {
  public async create(
    em: EntityManager,
    fromStoryId: string,
    toStoryId: string,
    type: StoryDependencyType,
  ) {
    if (fromStoryId === toStoryId) throw new SelfDependencyError();

    const [fromStory, toStory] = await Promise.all([
      em.findOne(UserStoryEntity, { id: fromStoryId }),
      em.findOne(UserStoryEntity, { id: toStoryId }),
    ]);
    if (!fromStory) throw new StoryNotFoundError(fromStoryId);
    if (!toStory) throw new StoryNotFoundError(toStoryId);

    if (fromStory.projectId !== toStory.projectId) {
      throw new CrossProjectDependencyError();
    }

    const existing = await em.findOne(StoryDependencyEntity, { fromStoryId, toStoryId });
    if (existing) throw new DuplicateDependencyError();

    if (type === "blocks") {
      const getOutgoing = async (storyId: string): Promise<string[]> => {
        const edges = await em.find(StoryDependencyEntity, {
          fromStoryId: storyId,
          type: "blocks",
        });
        return edges.map((e) => e.toStoryId);
      };
      // If toStory can already reach fromStory through `blocks` edges,
      // adding fromStory -> toStory would close a cycle.
      const reaches = await canReach(toStoryId, fromStoryId, getOutgoing);
      if (reaches) throw new CycleDetectedError();
    }

    const dep = em.getRepository(StoryDependencyEntity).create({
      id: randomUUID(),
      fromStoryId,
      toStoryId,
      type,
    });
    await em.flush();
    return dep;
  }
}
