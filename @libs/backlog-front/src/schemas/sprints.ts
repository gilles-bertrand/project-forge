// Sprint type — re-déclaré localement pour éviter le cycle de deps avec
// @libs/sprints-front (qui importe @libs/backlog-front/components/task-card).
// Le vrai schema WarpDrive vit dans @libs/sprints-front/schemas/sprints.
// Garder ces deux types synchronisés manuellement.

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Sprint {
  id: string | null;
  name: string;
  goal: string | null;
  projectId: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  velocityPoints: number;
  completedPoints: number;
  createdAt: string;
  updatedAt: string;
}

// Placeholder default export — Embroider auto-discovery requirement.
const _SprintTypeOnly = { type: 'sprints' as const };
export default _SprintTypeOnly;
