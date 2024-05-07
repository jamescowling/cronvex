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
  }).index("name", ["name"]),
});
