import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  syslog: defineTable({
    message: v.string(),
  }),
  crons: defineTable({
    function: v.string(),
    args: v.any(),
    // Only one of these should be set.
    ms: v.optional(v.float64()),
    cronspec: v.optional(v.string()),
  }),
});
