import Service from "@ember/service";
export default class CurrentProjectService extends Service {
    currentProjectId: string | null;
    setup(): void;
    setCurrent(id: string): void;
    clear(): void;
    get current(): string | null;
}
declare module "@ember/service" {
    interface Registry {
        "current-project": CurrentProjectService;
    }
}
//# sourceMappingURL=current-project.d.ts.map