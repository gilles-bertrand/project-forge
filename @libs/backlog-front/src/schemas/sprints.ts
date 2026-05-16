export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
}

// Placeholder default export — sprints n'a pas de schema WarpDrive (cf. ADR P7
// — le store global ignore les responses sprints, on bypass via fetch direct).
// L'app-js d'Embroider exige un default export pour chaque fichier de src/schemas/.
const SprintSchema = { type: 'sprints' as const };
export default SprintSchema;
