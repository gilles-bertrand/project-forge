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
declare const SprintSchema: {
    type: "sprints";
};
export default SprintSchema;
//# sourceMappingURL=sprints.d.ts.map