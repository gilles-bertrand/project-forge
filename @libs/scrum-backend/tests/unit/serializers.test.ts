import { describe, it, expect } from "vitest";
import { jsonApiSerializeProject } from "#src/project/project.serializer.js";
import { jsonApiSerializeEpic } from "#src/epic/epic.serializer.js";
import { jsonApiSerializeUserStory } from "#src/user-story/user-story.serializer.js";
import { jsonApiSerializeTask } from "#src/task/task.serializer.js";
import { jsonApiSerializeSprint } from "#src/sprint/sprint.serializer.js";
import { jsonApiSerializeComment } from "#src/task/comment.serializer.js";
import { jsonApiSerializeAttachment } from "#src/task/attachment.serializer.js";
import { jsonApiSerializeHistoryEntry } from "#src/task/history-entry.serializer.js";
import { jsonApiSerializeTaskAssignee } from "#src/task/task-assignee.serializer.js";
import { jsonApiSerializeProjectMember } from "#src/project/project-member.serializer.js";

const NOW = new Date("2025-01-20T00:00:00Z");

describe("scrum-backend serializers", () => {
  it("project: shape + ISO dates + nullables", () => {
    const out = jsonApiSerializeProject({
      id: "p1",
      name: "n",
      description: "d",
      status: "active",
      avatar: null,
      githubUrl: null,
      responsibleId: "u1",
      createdById: "u1",
      sprintDurationDays: 14,
      defaultVelocityPoints: 20,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(out).toEqual({
      id: "p1",
      type: "projects",
      attributes: {
        name: "n",
        description: "d",
        status: "active",
        avatar: null,
        githubUrl: null,
        responsibleId: "u1",
        createdById: "u1",
        sprintDurationDays: 14,
        defaultVelocityPoints: 20,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    });
  });
  it("epic: shape + status enum", () => {
    const out = jsonApiSerializeEpic({
      id: "e1",
      title: "t",
      description: "d",
      projectId: "p1",
      status: "in-progress",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(out.type).toBe("epics");
    expect(out.attributes.status).toBe("in-progress");
  });

  it("user-story: epicId nullable", () => {
    const out = jsonApiSerializeUserStory({
      id: "us1",
      title: "t",
      description: "d",
      projectId: "p1",
      epicId: null,
      sprintId: null,
      status: "todo",
      points: 3,
      priority: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(out.attributes.epicId).toBe(null);
    expect(out.attributes.points).toBe(3);
  });

  it("task: number + dueDate nullable", () => {
    const out = jsonApiSerializeTask({
      id: "t1",
      number: 1001,
      title: "t",
      description: "d",
      status: "in-progress",
      type: "Frontend",
      nature: "Feature",
      priority: "Haute",
      points: 3,
      estimatedHours: null,
      projectId: "p1",
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: "u1",
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(out.attributes.number).toBe(1001);
    expect(out.attributes.dueDate).toBe(null);
    expect(out.attributes.estimatedHours).toBe(null);
  });

  it("task: dueDate ISO when set", () => {
    const out = jsonApiSerializeTask({
      id: "t1",
      number: 1002,
      title: "t",
      description: "d",
      status: "todo",
      type: "Backend",
      nature: "Bug",
      priority: "Critique",
      points: 1,
      estimatedHours: 2.5,
      projectId: "p1",
      userStoryId: "us1",
      epicId: "e1",
      sprintId: "s1",
      createdById: "u1",
      dueDate: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(out.attributes.dueDate).toBe(NOW.toISOString());
    expect(out.attributes.estimatedHours).toBe(2.5);
  });

  it("sprint: dates ISO + status", () => {
    const out = jsonApiSerializeSprint({
      id: "s1",
      number: 88,
      name: "Sprint 88",
      goal: "Goal",
      projectId: "p1",
      startDate: NOW,
      endDate: NOW,
      status: "active",
      velocityPoints: 26,
      completedPoints: 2,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(out.attributes.startDate).toBe(NOW.toISOString());
    expect(out.attributes.status).toBe("active");
    expect(out.attributes.goal).toBe("Goal");
  });

  it("comment: metadata json", () => {
    const out = jsonApiSerializeComment({
      id: "c1",
      taskId: "t1",
      userId: "u1",
      content: "ok",
      type: "status-change",
      metadata: { from: "todo", to: "done" },
      createdAt: NOW,
    });
    expect(out.attributes.metadata).toEqual({ from: "todo", to: "done" });
  });
  it("attachment: sizeBytes int", () => {
    const out = jsonApiSerializeAttachment({
      id: "a1",
      taskId: "t1",
      projectId: "p1",
      name: "doc.pdf",
      url: "https://x/y",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      uploadedById: "u1",
      createdAt: NOW,
    });
    expect(out.attributes.sizeBytes).toBe(1024);
    expect(out.attributes.taskId).toBe("t1");
  });
  it("history-entry: ownerType + metadata", () => {
    const out = jsonApiSerializeHistoryEntry({
      id: "h1",
      ownerType: "task",
      ownerId: "t1",
      type: "status-change",
      description: "Moved to done",
      userId: "u1",
      metadata: null,
      createdAt: NOW,
    });
    expect(out.attributes.ownerType).toBe("task");
    expect(out.attributes.metadata).toBe(null);
  });
  it("task-assignee: assignedAt ISO", () => {
    const out = jsonApiSerializeTaskAssignee({
      id: "ta1",
      taskId: "t1",
      userId: "u1",
      assignedAt: NOW,
    });
    expect(out.attributes.assignedAt).toBe(NOW.toISOString());
  });

  it("project-member: role enum + joinedAt ISO", () => {
    const out = jsonApiSerializeProjectMember({
      id: "pm1",
      projectId: "p1",
      userId: "u1",
      role: "owner",
      joinedAt: NOW,
    });
    expect(out.attributes.role).toBe("owner");
    expect(out.attributes.joinedAt).toBe(NOW.toISOString());
  });
});
