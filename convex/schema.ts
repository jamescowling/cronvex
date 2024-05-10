import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

  // Demo app table.
  syslog: defineTable({
    message: v.string(),
  }),
});
