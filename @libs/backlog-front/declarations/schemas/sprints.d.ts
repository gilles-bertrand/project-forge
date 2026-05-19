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
declare const _SprintTypeOnly: {
    type: "sprints";
};
export default _SprintTypeOnly;
//# sourceMappingURL=sprints.d.ts.map