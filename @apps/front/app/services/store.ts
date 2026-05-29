import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';
import UserSchema from '@libs/users-front/schemas/users';
import ProjectSchema from '@libs/projects-front/schemas/projects';
import ProjectMemberSchema from '@libs/projects-front/schemas/project-members';
import EpicSchema from '@libs/backlog-front/schemas/epics';
import UserStorySchema from '@libs/backlog-front/schemas/user-stories';
import TaskSchema from '@libs/backlog-front/schemas/tasks';
import CommentSchema from '@libs/shared-front/schemas/comments';
import AttachmentSchema from '@libs/shared-front/schemas/attachments';
import AcceptanceTestSchema from '@libs/backlog-front/schemas/acceptance-tests';
import SprintSchema from '@libs/sprints-front/schemas/sprints';
import TimeEntrySchema from '@libs/time-tracking-front/schemas/time-entries';
import { setBuildURLConfig } from '@warp-drive/utilities';
import { CacheHandler, Fetch, RequestManager } from '@warp-drive/core';
import type Owner from '@ember/owner';
import { LegacyNetworkHandler } from '@warp-drive/legacy/compat';
import { setOwner } from '@ember/owner';
import AuthHandler from '@libs/users-front/handlers/auth';
import { getOwner } from '@ember/owner';
setBuildURLConfig({
  host: null,
  namespace: 'api/v1',
});

const legacyStore = useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  modelFragments: true,
  cache: JSONAPICache,
  schemas: [
    UserSchema,
    ProjectSchema,
    ProjectMemberSchema,
    EpicSchema,
    UserStorySchema,
    TaskSchema,
    CommentSchema,
    AttachmentSchema,
    AcceptanceTestSchema,
    SprintSchema,
    TimeEntrySchema,
  ],
  handlers: [],
});

export default class MyStore extends legacyStore {
  constructor(owner: Owner) {
    super(owner);

    const authHandler = new AuthHandler();
    setOwner(authHandler, getOwner(this)!);

    const manager = new RequestManager();

    setOwner(this.requestManager, getOwner(this)!);

    this.requestManager = manager
      .use([authHandler, LegacyNetworkHandler, Fetch])
      .useCache(CacheHandler);
  }
}
