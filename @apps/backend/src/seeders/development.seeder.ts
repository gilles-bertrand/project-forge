/* oxlint-disable max-lines, max-lines-per-function */
import {
  CommentEntity,
  EpicEntity,
  ProjectEntity,
  ProjectMemberEntity,
  ProjectTaskCounterEntity,
  SprintEntity,
  TaskAssigneeEntity,
  TaskEntity,
  UserStoryEntity,
} from "@libs/scrum-backend";
import { TimeEntryEntity } from "@libs/time-tracking-backend";
import { hashPassword, UserEntity } from "@libs/users-backend";
import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager) {
    await em.nativeDelete(TimeEntryEntity, {});
    await em.nativeDelete(CommentEntity, {});
    await em.nativeDelete(TaskAssigneeEntity, {});
    await em.nativeDelete(TaskEntity, {});
    await em.nativeDelete(UserStoryEntity, {});
    await em.nativeDelete(EpicEntity, {});
    await em.nativeDelete(SprintEntity, {});
    await em.nativeDelete(ProjectMemberEntity, {});
    await em.nativeDelete(ProjectTaskCounterEntity, {});
    await em.nativeDelete(ProjectEntity, {});
    await em.nativeDelete(UserEntity, {});

    const hashedPassword = await hashPassword("123456789");
    await this.seedUsers(em, hashedPassword);
    await this.seedProjects(em);
    await this.seedBacklog(em);
    await this.seedSprints(em);
    await this.seedTasks(em);
    await this.seedTimeEntries(em);
    await this.seedTaskCounters(em);
    await em.flush();
  }

  private async seedTaskCounters(em: EntityManager) {
    // For each project, set the counter to max(task.number) + 1, default 1001
    await em.flush();
    const projects = await em.find(ProjectEntity, {}, { fields: ["id"] });
    for (const project of projects) {
      const tasks = await em.find(TaskEntity, { projectId: project.id }, { fields: ["number"] });
      const maxNumber = tasks.reduce((acc, t) => (t.number > acc ? t.number : acc), 1000);
      em.create(ProjectTaskCounterEntity, {
        projectId: project.id,
        nextNumber: maxNumber + 1,
      });
    }
  }

  // oxlint-disable-next-line max-lines-per-function
  private async seedUsers(em: EntityManager, hashedPassword: string) {
    const users = [
      {
        id: "user-alice",
        email: "gilles@triptyk.eu",
        firstName: "Alice",
        lastName: "Martin",
        role: "Product Owner",
        color: "#F48FB1",
      },
      {
        id: "user-bob",
        email: "bob.durant@sprintforge.com",
        firstName: "Bob",
        lastName: "Durant",
        role: "Scrum Master",
        color: "#7FDBCA",
      },
      {
        id: "user-claire",
        email: "claire.dubois@sprintforge.com",
        firstName: "Claire",
        lastName: "Dubois",
        role: "Developer",
        color: "#66C7B8",
      },
      {
        id: "user-david",
        email: "david.leroy@sprintforge.com",
        firstName: "David",
        lastName: "Leroy",
        role: "Developer",
        color: "#FFB74D",
      },
      {
        id: "user-emma",
        email: "emma.bernard@sprintforge.com",
        firstName: "Emma",
        lastName: "Bernard",
        role: "Designer UX",
        color: "#BA68C8",
      },
      {
        id: "user-francois",
        email: "francois.petit@sprintforge.com",
        firstName: "François",
        lastName: "Petit",
        role: "QA Tester",
        color: "#4DB6AC",
      },
      {
        id: "user-gaelle",
        email: "gaelle.moreau@sprintforge.com",
        firstName: "Gaëlle",
        lastName: "Moreau",
        role: "DevOps",
        color: "#FFA726",
      },
    ];
    for (const u of users) {
      em.create(UserEntity, { ...u, password: hashedPassword, avatar: null });
    }
  }

  // oxlint-disable-next-line max-lines-per-function
  private async seedProjects(em: EntityManager) {
    const projects = [
      {
        id: "project-ecommerce",
        name: "E-Commerce Platform",
        description: "Plateforme de vente en ligne complète avec gestion des stocks",
        status: "active",
        createdAt: "2025-01-01",
      },
      {
        id: "project-banking",
        name: "Mobile Banking App",
        description: "Application mobile de gestion bancaire",
        status: "active",
        createdAt: "2025-01-05",
      },
      {
        id: "project-crm",
        name: "CRM System",
        description: "Système de gestion de la relation client",
        status: "planned",
        createdAt: "2025-01-10",
      },
    ];
    for (const p of projects) {
      em.create(ProjectEntity, {
        ...p,
        avatar: null,
        githubUrl: null,
        responsibleId: "user-bob",
        createdById: "user-bob",
        sprintDurationDays: 14,
        defaultVelocityPoints: 20,
        createdAt: new Date(`${p.createdAt}T00:00:00Z`),
        updatedAt: new Date(`${p.createdAt}T00:00:00Z`),
      });
    }

    const memberships: Array<{ userId: string; projects: string[] }> = [
      { userId: "user-bob", projects: ["project-ecommerce", "project-banking", "project-crm"] },
      { userId: "user-claire", projects: ["project-ecommerce", "project-banking", "project-crm"] },
      { userId: "user-david", projects: ["project-ecommerce", "project-crm"] },
      { userId: "user-emma", projects: ["project-ecommerce", "project-banking"] },
      { userId: "user-francois", projects: ["project-ecommerce"] },
      { userId: "user-gaelle", projects: ["project-ecommerce"] },
    ];
    let pmIdx = 0;
    for (const m of memberships) {
      for (const projectId of m.projects) {
        em.create(ProjectMemberEntity, {
          id: `pm-${pmIdx++}`,
          projectId,
          userId: m.userId,
          role: m.userId === "user-bob" ? "owner" : "member",
        });
      }
    }
  }

  private async seedBacklog(em: EntityManager) {
    const epics = [
      {
        id: "epic-auth",
        title: "User Authentication",
        description: "Système complet d'authentification et autorisation",
        status: "in-progress",
        rank: 0,
      },
      {
        id: "epic-catalog",
        title: "Product Catalog",
        description: "Catalogue de produits avec recherche et filtres",
        status: "in-progress",
        rank: 1,
      },
    ];
    for (const e of epics) {
      em.create(EpicEntity, {
        ...e,
        projectId: "project-ecommerce",
        createdById: "user-bob",
        color: "#6B7280",
        type: "functional",
        value: null,
        notes: null,
        tags: [],
      });
    }

    const priorityFromInt = (p: number): "Basse" | "Moyenne" | "Haute" | "Critique" => {
      if (p <= 1) return "Basse";
      if (p === 2) return "Moyenne";
      if (p === 3) return "Haute";
      return "Critique";
    };

    const statusFromLegacy = (
      s: string,
    ): "suggested" | "accepted" | "estimated" | "planned" | "in-progress" | "done" => {
      if (s === "todo") return "accepted";
      if (s === "in-progress") return "in-progress";
      if (s === "done") return "done";
      // Already a new valid status
      return s as "suggested" | "accepted" | "estimated" | "planned" | "in-progress" | "done";
    };

    const stories = [
      {
        id: "us1",
        title: "Login utilisateur",
        description: "En tant qu'utilisateur, je veux me connecter",
        epicId: "epic-auth",
        status: "done",
        points: 3,
        priority: 1,
      },
      {
        id: "us2",
        title: "Inscription utilisateur",
        description: "En tant que visiteur, je veux créer un compte",
        epicId: "epic-auth",
        status: "in-progress",
        points: 5,
        priority: 2,
      },
      {
        id: "us3",
        title: "Affichage des produits",
        description: "En tant qu'utilisateur, je veux voir la liste des produits",
        epicId: "epic-catalog",
        status: "in-progress",
        points: 8,
        priority: 3,
      },
      {
        id: "us4",
        title: "Recherche de produits",
        description: "En tant qu'utilisateur, je veux rechercher des produits",
        epicId: "epic-catalog",
        status: "todo",
        points: 5,
        priority: 4,
      },
      {
        id: "us5",
        title: "Filtres de produits",
        description: "En tant qu'utilisateur, je veux filtrer les produits",
        epicId: "epic-catalog",
        status: "todo",
        points: 5,
        priority: 5,
      },
    ];
    let storyIdx = 0;
    for (const s of stories) {
      em.create(UserStoryEntity, {
        id: s.id,
        title: s.title,
        description: s.description,
        notes: null,
        color: null,
        projectId: "project-ecommerce",
        epicId: s.epicId,
        sprintId: null,
        status: statusFromLegacy(s.status),
        points: s.points,
        priority: priorityFromInt(s.priority),
        rank: storyIdx++,
        value: null,
        createdById: "user-bob",
        tags: [],
      });
    }
  }

  // oxlint-disable-next-line max-lines-per-function
  private async seedSprints(em: EntityManager) {
    const historic = [
      {
        id: "sprint-84",
        name: "Sprint 84",
        start: "2024-11-04",
        end: "2024-11-17",
        vp: 18,
        cp: 18,
      },
      {
        id: "sprint-85",
        name: "Sprint 85",
        start: "2024-11-18",
        end: "2024-12-01",
        vp: 21,
        cp: 20,
      },
      {
        id: "sprint-86",
        name: "Sprint 86",
        start: "2024-12-02",
        end: "2024-12-15",
        vp: 24,
        cp: 22,
      },
      {
        id: "sprint-87",
        name: "Sprint 87",
        start: "2024-12-16",
        end: "2024-12-29",
        vp: 20,
        cp: 20,
      },
    ];
    for (const s of historic) {
      em.create(SprintEntity, {
        id: s.id,
        number: Number(s.name.replace(/^Sprint\s+/, "")),
        name: s.name,
        goal: null,
        projectId: "project-ecommerce",
        startDate: new Date(`${s.start}T00:00:00Z`),
        endDate: new Date(`${s.end}T00:00:00Z`),
        status: "completed",
        velocityPoints: s.vp,
        completedPoints: s.cp,
      });
    }
    em.create(SprintEntity, {
      id: "sprint-88",
      number: 88,
      name: "Sprint 88",
      goal: "Finaliser le tunnel d'achat et intégrer le paiement Stripe",
      projectId: "project-ecommerce",
      startDate: new Date("2025-01-20T00:00:00Z"),
      endDate: new Date("2025-02-02T00:00:00Z"),
      status: "active",
      velocityPoints: 26,
      completedPoints: 2,
    });
    em.create(SprintEntity, {
      id: "sprint-89",
      number: 89,
      name: "Sprint 89",
      goal: "Amélioration de la gestion des expéditions et suivi colis",
      projectId: "project-ecommerce",
      startDate: new Date("2025-02-03T00:00:00Z"),
      endDate: new Date("2025-02-16T00:00:00Z"),
      status: "planned",
      velocityPoints: 0,
      completedPoints: 0,
    });
    em.create(SprintEntity, {
      id: "sprint-90",
      number: 90,
      name: "Sprint 90",
      goal: "Optimisation des performances et refonte du tableau de bord admin",
      projectId: "project-ecommerce",
      startDate: new Date("2025-02-17T00:00:00Z"),
      endDate: new Date("2025-03-02T00:00:00Z"),
      status: "planned",
      velocityPoints: 0,
      completedPoints: 0,
    });
  }

  // oxlint-disable-next-line max-lines-per-function
  private async seedTasks(em: EntityManager) {
    const CREATED = new Date("2025-01-20T00:00:00Z");
    const sprint88 = [
      {
        id: "task-1005",
        number: 1005,
        title: "Implémenter formulaire d'inscription",
        status: "in-progress",
        type: "Frontend",
        nature: "Feature",
        priority: "Haute",
        points: 2,
        hours: 4.0,
        usId: "us2",
        epicId: "epic-auth",
      },
      {
        id: "task-1006",
        number: 1006,
        title: "Créer liste de produits",
        status: "in-progress",
        type: "Frontend",
        nature: "Feature",
        priority: "Haute",
        points: 3,
        hours: 6.0,
        usId: "us3",
        epicId: "epic-catalog",
      },
      {
        id: "task-1007",
        number: 1007,
        title: "API endpoint liste produits",
        status: "done",
        type: "Backend",
        nature: "Feature",
        priority: "Haute",
        points: 3,
        hours: 4.0,
        usId: "us3",
        epicId: "epic-catalog",
      },
      {
        id: "task-1008",
        number: 1008,
        title: "Pagination produits",
        status: "todo",
        type: "Frontend",
        nature: "Feature",
        priority: "Moyenne",
        points: 2,
        hours: 3.0,
        usId: "us3",
        epicId: "epic-catalog",
      },
      {
        id: "task-1009",
        number: 1009,
        title: "Barre de recherche",
        status: "uat",
        type: "Frontend",
        nature: "Feature",
        priority: "Moyenne",
        points: 3,
        hours: 4.0,
        usId: "us4",
        epicId: "epic-catalog",
      },
      {
        id: "task-1010",
        number: 1010,
        title: "API recherche full-text",
        status: "done",
        type: "Backend",
        nature: "Feature",
        priority: "Haute",
        points: 5,
        hours: 6.0,
        usId: "us4",
        epicId: "epic-catalog",
      },
      {
        id: "task-1011",
        number: 1011,
        title: "Filtres catégories",
        status: "done",
        type: "Frontend",
        nature: "Feature",
        priority: "Moyenne",
        points: 2,
        hours: 2.0,
        usId: "us5",
        epicId: "epic-catalog",
      },
      {
        id: "task-1012",
        number: 1012,
        title: "Filtres prix",
        status: "todo",
        type: "Frontend",
        nature: "Feature",
        priority: "Basse",
        points: 1,
        hours: 2.0,
        usId: "us5",
        epicId: "epic-catalog",
      },
    ];
    for (const t of sprint88) {
      em.create(TaskEntity, {
        id: t.id,
        number: t.number,
        title: t.title,
        description: t.title,
        status: t.status,
        type: t.type,
        nature: t.nature,
        priority: t.priority,
        points: t.points,
        estimatedHours: t.hours,
        projectId: "project-ecommerce",
        userStoryId: t.usId,
        epicId: t.epicId,
        sprintId: "sprint-88",
        createdById: "user-claire",
        dueDate: null,
        createdAt: CREATED,
        updatedAt: CREATED,
      });
    }

    const backlog = [
      {
        id: "task-1013",
        number: 1013,
        title: "Optimiser performance liste",
        type: "Frontend",
        nature: "Techdebt",
        priority: "Moyenne",
        points: 3,
        usId: "us3",
        epicId: "epic-catalog",
      },
      {
        id: "task-1014",
        number: 1014,
        title: "Corriger bug images",
        type: "Frontend",
        nature: "Bug",
        priority: "Haute",
        points: 2,
        usId: null,
        epicId: null,
      },
      {
        id: "task-1015",
        number: 1015,
        title: "Documentation API",
        type: "Backend",
        nature: "Review",
        priority: "Basse",
        points: 5,
        usId: null,
        epicId: null,
      },
      {
        id: "task-1016",
        number: 1016,
        title: "Setup CI/CD",
        type: "DevOps",
        nature: "Infra",
        priority: "Haute",
        points: 8,
        usId: null,
        epicId: null,
      },
      {
        id: "task-1017",
        number: 1017,
        title: "Refactoring composants",
        type: "Frontend",
        nature: "Refacto",
        priority: "Basse",
        points: 5,
        usId: null,
        epicId: null,
      },
    ];
    const BL_CREATED = new Date("2025-01-15T00:00:00Z");
    for (const t of backlog) {
      em.create(TaskEntity, {
        id: t.id,
        number: t.number,
        title: t.title,
        description: t.title,
        status: "todo",
        type: t.type,
        nature: t.nature,
        priority: t.priority,
        points: t.points,
        estimatedHours: null,
        projectId: "project-ecommerce",
        userStoryId: t.usId ?? null,
        epicId: t.epicId ?? null,
        sprintId: null,
        createdById: "user-claire",
        dueDate: null,
        createdAt: BL_CREATED,
        updatedAt: BL_CREATED,
      });
    }

    // Assignees
    for (const taskId of [
      "task-1005",
      "task-1006",
      "task-1007",
      "task-1008",
      "task-1009",
      "task-1010",
      "task-1011",
      "task-1012",
    ]) {
      em.create(TaskAssigneeEntity, { id: `ta-claire-${taskId}`, taskId, userId: "user-claire" });
    }
    em.create(TaskAssigneeEntity, {
      id: "ta-david-1006",
      taskId: "task-1006",
      userId: "user-david",
    });

    // Comment
    em.create(CommentEntity, {
      id: "comment-001",
      ownerType: "task",
      ownerId: "task-1005",
      userId: "user-claire",
      content: "Démarrage du formulaire d'inscription — structure HTML en place",
      type: "comment",
      metadata: null,
      createdAt: new Date("2025-01-20T10:00:00Z"),
    });
    em.create(CommentEntity, {
      id: "comment-002",
      ownerType: "task",
      ownerId: "task-1011",
      userId: "user-claire",
      content: "Filtres catégories terminés",
      type: "status-change",
      metadata: { from: "in-progress", to: "done" },
      createdAt: new Date("2025-01-22T14:00:00Z"),
    });
  }

  // oxlint-disable-next-line max-lines-per-function
  private async seedTimeEntries(em: EntityManager) {
    const entries = [
      {
        id: "time-001",
        taskId: "task-1005",
        date: "2025-01-20T09:00:00Z",
        hours: 2.5,
        desc: "Démarrage du formulaire inscription",
      },
      {
        id: "time-002",
        taskId: "task-1006",
        date: "2025-01-20T14:00:00Z",
        hours: 2.0,
        desc: "Maquette liste produits",
      },
      {
        id: "time-003",
        taskId: "task-1005",
        date: "2025-01-21T09:00:00Z",
        hours: 2.0,
        desc: "Validation des champs",
      },
      {
        id: "time-004",
        taskId: "task-1011",
        date: "2025-01-21T14:00:00Z",
        hours: 1.5,
        desc: "Filtres catégories implémentés",
      },
      {
        id: "time-005",
        taskId: "task-1011",
        date: "2025-01-22T09:00:00Z",
        hours: 0.5,
        desc: "Tests et correction des filtres",
      },
      {
        id: "time-006",
        taskId: "task-1006",
        date: "2025-01-22T10:00:00Z",
        hours: 2.0,
        desc: "Intégration des données API",
      },
      {
        id: "time-007",
        taskId: "task-1009",
        date: "2025-01-23T09:00:00Z",
        hours: 2.0,
        desc: "Composant barre de recherche",
      },
      {
        id: "time-008",
        taskId: "task-1012",
        date: "2025-01-23T14:00:00Z",
        hours: 1.0,
        desc: "Slider de prix",
      },
      {
        id: "time-009",
        taskId: "task-1008",
        date: "2025-01-24T09:00:00Z",
        hours: 1.5,
        desc: "Pagination — implémentation",
      },
      {
        id: "time-010",
        taskId: "task-1005",
        date: "2025-01-24T14:00:00Z",
        hours: 2.0,
        desc: "Tests du formulaire d'inscription",
      },
    ];
    for (const t of entries) {
      em.create(TimeEntryEntity, {
        id: t.id,
        taskId: t.taskId,
        userId: "user-claire",
        projectId: "project-ecommerce",
        hours: t.hours,
        date: new Date(t.date),
        description: t.desc,
        createdAt: new Date(t.date),
      });
    }
  }
}
