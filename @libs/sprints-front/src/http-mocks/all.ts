import type { RequestHandler } from "msw";
import allSprintsHandlersImpl from "./sprints.ts";

export const allSprintsHandlers: RequestHandler[] = allSprintsHandlersImpl;
