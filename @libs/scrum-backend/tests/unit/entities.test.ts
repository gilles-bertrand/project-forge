import { describe, it, expect } from "vitest";
import type { ProjectEntityType } from "#src/project/project.entity.js";
import type { ProjectMemberEntityType } from "#src/project/project-member.entity.js";
import type { EpicEntityType } from "#src/epic/epic.entity.js";
import type { UserStoryEntityType } from "#src/user-story/user-story.entity.js";
import type { TaskEntityType } from "#src/task/task.entity.js";
import type { TaskAssigneeEntityType } from "#src/task/task-assignee.entity.js";
import type { CommentEntityType } from "#src/task/comment.entity.js";
import type { AttachmentEntityType } from "#src/task/attachment.entity.js";
import type { HistoryEntryEntityType } from "#src/task/history-entry.entity.js";
import type { SprintEntityType } from "#src/sprint/sprint.entity.js";
import type { SprintBurndownSnapshotEntityType } from "#src/sprint/sprint-burndown-snapshot.entity.js";
import type { ProjectTaskCounterEntityType } from "#src/project/project-task-counter.entity.js";
import type { AcceptanceTestEntityType } from "#src/acceptance-test/acceptance-test.entity.js";
import type { StoryDependencyEntityType } from "#src/story-dependency/story-dependency.entity.js";

const NOW = new Date("2025-01-20T00:00:00Z");

describe("scrum-backend — entity shapes (round-trip)", () => {
  it("ProjectEntity has all required properties", () => {
    const project: ProjectEntityType = {
      id: "project-ecommerce",
      name: "E-Commerce Platform",
      description: "Plateforme de vente en ligne",
      status: "active",
      avatar: null,
      githubUrl: null,
      responsibleId: "user-bob",
      createdById: "user-bob",
      sprintDurationDays: 14,
      defaultVelocityPoints: 20,
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(project.id).toBe("project-ecommerce");
    expect(project.status).toBe("active");
  });

  it("ProjectMemberEntity has all required properties", () => {
    const member: ProjectMemberEntityType = {
      id: "pm-1",
      projectId: "project-ecommerce",
      userId: "user-claire",
      role: "member",
      joinedAt: NOW,
    };
    expect(member.projectId).toBe("project-ecommerce");
  });

  it("EpicEntity has all required properties", () => {
    const epic: EpicEntityType = {
      id: "epic-auth",
      title: "User Authentication",
      description: "Système d'authentification",
      notes: null,
      color: "#6B7280",
      type: "functional",
      value: null,
      rank: 0,
      projectId: "project-ecommerce",
      createdById: "user-bob",
      status: "in-progress",
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(epic.status).toBe("in-progress");
    expect(epic.type).toBe("functional");
    expect(epic.color).toBe("#6B7280");
  });

  it("UserStoryEntity has all required properties", () => {
    const story: UserStoryEntityType = {
      id: "us1",
      title: "Login utilisateur",
      description: "En tant qu'utilisateur...",
      notes: null,
      color: null,
      projectId: "project-ecommerce",
      epicId: "epic-auth",
      sprintId: null,
      status: "accepted",
      points: 3,
      priority: "Moyenne",
      rank: 0,
      value: null,
      createdById: "user-bob",
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(story.epicId).toBe("epic-auth");
    expect(story.points).toBe(3);
    expect(story.priority).toBe("Moyenne");
    expect(story.status).toBe("accepted");
  });

  it("TaskEntity has all required properties", () => {
    const task: TaskEntityType = {
      id: "task-1005",
      number: 1005,
      title: "Implémenter formulaire d'inscription",
      description: "Développer le formulaire côté frontend",
      status: "in-progress",
      type: "Frontend",
      nature: "Feature",
      priority: "Moyenne",
      points: 2,
      estimatedHours: 4.0,
      remainingHours: 2.5,
      tags: ["frontend"],
      projectId: "project-ecommerce",
      userStoryId: "us2",
      epicId: "epic-auth",
      sprintId: "sprint-88",
      createdById: "user-claire",
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(task.number).toBe(1005);
    expect(task.sprintId).toBe("sprint-88");
    expect(task.estimatedHours).toBe(4.0);
    expect(task.remainingHours).toBe(2.5);
    expect(task.tags).toEqual(["frontend"]);
  });

  it("TaskAssigneeEntity has all required properties", () => {
    const assignee: TaskAssigneeEntityType = {
      id: "ta-1",
      taskId: "task-1005",
      userId: "user-claire",
      assignedAt: NOW,
    };
    expect(assignee.taskId).toBe("task-1005");
  });

  it("CommentEntity has all required properties", () => {
    const comment: CommentEntityType = {
      id: "comment-1",
      ownerType: "task",
      ownerId: "task-1005",
      userId: "user-claire",
      content: "Démarrage du développement",
      type: "comment",
      metadata: null,
      createdAt: NOW,
    };
    expect(comment.type).toBe("comment");
    expect(comment.metadata).toBeNull();
    expect(comment.ownerType).toBe("task");
  });

  it("AttachmentEntity has all required properties", () => {
    const attachment: AttachmentEntityType = {
      id: "att-1",
      ownerType: "task",
      ownerId: "task-1005",
      name: "maquette.png",
      url: "https://storage.example.com/maquette.png",
      mimeType: "image/png",
      sizeBytes: 204800,
      uploadedById: "user-emma",
      createdAt: NOW,
    };
    expect(attachment.ownerType).toBe("task");
    expect(attachment.sizeBytes).toBeGreaterThan(0);
  });

  it("HistoryEntryEntity has all required properties", () => {
    const entry: HistoryEntryEntityType = {
      id: "hist-1",
      ownerType: "task",
      ownerId: "task-1005",
      type: "status-change",
      description: "Statut passé de todo à in-progress",
      userId: "user-claire",
      metadata: { from: "todo", to: "in-progress" },
      createdAt: NOW,
    };
    expect(entry.ownerType).toBe("task");
    expect(entry.metadata).toEqual({ from: "todo", to: "in-progress" });
  });

  it("AcceptanceTestEntity has all required properties", () => {
    const at: AcceptanceTestEntityType = {
      id: "at-1",
      userStoryId: "us1",
      taskId: null,
      name: "Login valide",
      description: "Submit le formulaire avec un mot de passe correct",
      state: "to-check",
      rank: 0,
      createdById: "user-bob",
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(at.userStoryId).toBe("us1");
    expect(at.state).toBe("to-check");
    expect(at.rank).toBe(0);
  });

  it("StoryDependencyEntity has all required properties", () => {
    const dep: StoryDependencyEntityType = {
      id: "dep-1",
      fromStoryId: "us1",
      toStoryId: "us2",
      type: "blocks",
      createdAt: NOW,
    };
    expect(dep.fromStoryId).toBe("us1");
    expect(dep.toStoryId).toBe("us2");
    expect(dep.type).toBe("blocks");
  });

  it("SprintEntity has all required properties", () => {
    const sprint: SprintEntityType = {
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
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(sprint.status).toBe("active");
    expect(sprint.velocityPoints).toBe(26);
  });

  it("SprintBurndownSnapshotEntity has all required properties", () => {
    const snap: SprintBurndownSnapshotEntityType = {
      id: "snap-1",
      sprintId: "sprint-88",
      snapshotDate: NOW,
      remainingHoursTotal: 42.5,
      remainingPointsTotal: 12,
      taskCount: 8,
      createdAt: NOW,
    };
    expect(snap.sprintId).toBe("sprint-88");
    expect(snap.remainingHoursTotal).toBe(42.5);
    expect(snap.taskCount).toBe(8);
  });

  it("ProjectTaskCounterEntity has all required properties", () => {
    const counter: ProjectTaskCounterEntityType = {
      projectId: "project-ecommerce",
      nextNumber: 1042,
    };
    expect(counter.projectId).toBe("project-ecommerce");
    expect(counter.nextNumber).toBe(1042);
  });
});
