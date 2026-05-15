import {
  withDefaults,
  type WithLegacy,
} from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';

const EpicSchema = withDefaults({
  type: 'epics',
  fields: [
    { name: 'title', kind: 'attribute' },
    { name: 'description', kind: 'attribute' },
    { name: 'projectId', kind: 'attribute' },
    { name: 'status', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
  ],
});

export default EpicSchema;

export type EpicStatus = 'todo' | 'in-progress' | 'done';

export type Epic = WithLegacy<{
  title: string;
  description: string;
  projectId: string;
  status: EpicStatus;
  createdAt: string;
  updatedAt: string;
  [Type]: 'epics';
}>;
