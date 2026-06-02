import {
  withDefaults,
  type WithLegacy,
} from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';

const AcceptanceTestSchema = withDefaults({
  type: 'acceptance-tests',
  fields: [
    { name: 'userStoryId', kind: 'attribute' },
    { name: 'taskId', kind: 'attribute' },
    { name: 'name', kind: 'attribute' },
    { name: 'description', kind: 'attribute' },
    { name: 'state', kind: 'attribute' },
    { name: 'rank', kind: 'attribute' },
    { name: 'createdById', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
  ],
});

export default AcceptanceTestSchema;

export type AcceptanceTestState = 'to-check' | 'failed' | 'success';

export interface AcceptanceTest extends WithLegacy<{
  [Type]: 'acceptance-tests';
}> {
  id: string;
  userStoryId: string | null;
  taskId: string | null;
  name: string;
  description: string;
  state: AcceptanceTestState;
  rank: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}
