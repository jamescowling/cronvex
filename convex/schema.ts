import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // XXX delete
  crons: defineTable({
    args: v.any(),
    executionJobId: v.optional(v.id("_scheduled_functions")),
    functionName: v.string(),
    name: v.optional(v.string()),
    schedule: v.union(
      v.object({
        kind: v.literal("interval"),
        ms: v.float64(),
      }),
      v.object({
        cronspec: v.string(),
        kind: v.literal("cron"),
      })
    ),
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
  }).index("name", ["name"]),

  // XXX delete
  jobs: defineTable({
    body: v.optional(v.string()),
    cronId: v.optional(v.id("crons")),
    headers: v.optional(v.string()),
    method: v.string(),
    name: v.optional(v.string()),
    url: v.string(),
    userId: v.id("users"),
  }).index("userId", ["userId"]),

  // Registered http request-sending jobs.
  requests: defineTable({
    userId: v.id("users"),
    // This name is unrelated to the name of the actual cron itself. The latter
    // is an optional unique identifier across all crons whereas the name in
    // this table is just a convenient per-user name for showing in their UI.
    name: v.optional(v.string()),
    url: v.string(),
    method: v.string(), // "GET", "POST", etc.
    headers: v.optional(v.string()), // TODO: migrate to Record type when we add it
    body: v.optional(v.string()),
    cronId: v.optional(v.string()),
  }).index("userId", ["userId"]),

  // Web logs from outgoing requests.
  weblogs: defineTable({
    userId: v.id("users"),
    url: v.string(),
    method: v.string(),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.float64(),
    response: v.string(),
  }).index("userId", ["userId"]),
});
