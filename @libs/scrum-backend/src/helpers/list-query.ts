import { z } from "zod";

export const ListQuerySchema = z
  .object({
    "page[number]": z.coerce.number().int().min(1).default(1).optional(),
    "page[size]": z.coerce.number().int().min(1).max(100).default(25).optional(),
    sort: z.string().optional(),
  })
  .passthrough();

export interface ParsedListQuery {
  where: Record<string, unknown>;
  orderBy: Record<string, "ASC" | "DESC">;
  page: number;
  limit: number;
  offset: number;
  search: string | undefined;
}

function parseOrderBy(
  sortParam: string,
  allowedSortFields: string[],
): Record<string, "ASC" | "DESC"> {
  const orderBy: Record<string, "ASC" | "DESC"> = {};
  for (const field of sortParam.split(",").filter(Boolean)) {
    const desc = field.startsWith("-");
    const name = desc ? field.slice(1) : field;
    if (allowedSortFields.includes(name)) orderBy[name] = desc ? "DESC" : "ASC";
  }
  return orderBy;
}

function parseFilters(query: Record<string, unknown>): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    const m = /^filter\[([\w.]+)\]$/.exec(k);
    const field = m?.[1];
    if (field && field !== "search") where[field] = v;
  }
  return where;
}

export function parseListQuery(
  query: Record<string, unknown>,
  allowedSortFields: string[],
): ParsedListQuery {
  const page = Number(query["page[number]"] ?? 1);
  const limit = Math.min(Number(query["page[size]"] ?? 25), 100);
  const offset = (page - 1) * limit;

  const sortParam = (query["sort"] as string | undefined) ?? "";
  const orderBy = parseOrderBy(sortParam, allowedSortFields);
  const where = parseFilters(query);
  const search = query["filter[search]"] as string | undefined;

  return { where, orderBy, page, limit, offset, search };
}
