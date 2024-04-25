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
});
