import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { url } from "inspector";

export default defineSchema({
  // Cronvex table.
  crons: defineTable({
    // Fully qualified function name.
    function: v.string(),

    // Args as an object.
    args: v.any(),

    // Optional unique name.
    name: v.optional(v.string()),

    // Schedule, only one should be set.
    ms: v.optional(v.float64()), // milliseconds
    cronspec: v.optional(v.string()), // "* * * * *"

    // References to scheduled jobs.
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
    executionJobId: v.optional(v.id("_scheduled_functions")),
  }).index("name", ["name"]),

  // Outgoing webhook requests to send.
  webhooks: defineTable({
    url: v.string(),
    name: v.optional(v.string()),
    method: v.optional(v.string()), // "GET", "POST", etc.
    // TODO: this would ideally be a record
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
    cron: v.optional(v.id("crons")),
  }),

  // Web logs from incoming POST requests.
  inbound_logs: defineTable({
    url: v.string(),
    method: v.string(),
    headers: v.string(),
    body: v.string(),
  }),

  // Web logs from outgoing requests.
  outbound_logs: defineTable({
    url: v.string(),
    method: v.optional(v.string()),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.float64(),
    response: v.string(),
  }),
});
