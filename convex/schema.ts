import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@xixixao/convex-auth/server";

export default defineSchema({
  ...authTables,

  // User space crons table. This is designed to be independent of any specific
  // Cronvex functionality since we plan on pulling this out into a helper
  // library to be used elsewhere.
  crons: defineTable({
    name: v.optional(v.string()), // optional cron name
    functionName: v.string(), // fully qualified function name
    args: v.any(), // args as an object

    // Schedule, only one should be set.
    ms: v.optional(v.float64()), // milliseconds
    cronspec: v.optional(v.string()), // "* * * * *"

    schedulerJobId: v.optional(v.id("_scheduled_functions")),
    executionJobId: v.optional(v.id("_scheduled_functions")),
  }).index("name", ["name"]),

  // Registered http request-sending jobs. Each is associated with an entry in the
  // crons table which is the underlying scheduler for the job.
  jobs: defineTable({
    userId: v.id("users"),
    // This name is unrelated to the name in the crons table. The crons table
    // name is a unique name across all crons and used as an identifier whereas
    // the name in this table is just a convenient per-user name for showing in
    // their UI.
    name: v.optional(v.string()),
    url: v.string(),
    method: v.string(), // "GET", "POST", etc.
    headers: v.optional(v.string()), // TODO: migrate to Record type when we add it
    body: v.optional(v.string()),
    cronId: v.optional(v.id("crons")),
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
