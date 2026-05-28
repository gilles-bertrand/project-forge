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
    { name: 'notes', kind: 'attribute' },
    { name: 'color', kind: 'attribute' },
    { name: 'type', kind: 'attribute' },
    { name: 'value', kind: 'attribute' },
    { name: 'rank', kind: 'attribute' },
    { name: 'projectId', kind: 'attribute' },
    { name: 'createdById', kind: 'attribute' },
    { name: 'status', kind: 'attribute' },
    { name: 'tags', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
  ],
});

export default EpicSchema;

export type EpicStatus = 'todo' | 'in-progress' | 'done';
export type EpicType = 'functional' | 'architectural';

export type Epic = WithLegacy<{
  title: string;
  description: string;
  notes: string | null;
  color: string;
  type: EpicType;
  value: number | null;
  rank: number;
  projectId: string;
  createdById: string | null;
  status: EpicStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  [Type]: 'epics';
}>;
