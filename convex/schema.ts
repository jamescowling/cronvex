import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  crons: defineTable({
    function: v.string(),
    args: v.any(),
    // Only one of these two should be set.
    ms: v.optional(v.float64()),
    cronspec: v.optional(v.string()),
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
    executionJobId: v.optional(v.id("_scheduled_functions")),
  }),
  syslog: defineTable({
    message: v.string(),
  }),
});
