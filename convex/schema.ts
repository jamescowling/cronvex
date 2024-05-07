import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cronjobs: defineTable({
    message: v.string(),
    cronspec: v.string(),
  }),
  syslog: defineTable({
    message: v.string(),
  }),
  crons: defineTable({
    name: v.string(),
    function: v.string(),
    args: v.any(),
    // Only one of these should be set.
    seconds: v.optional(v.int64()),
    cronspec: v.optional(v.string()),
  }).index("name", ["name"]),
});
