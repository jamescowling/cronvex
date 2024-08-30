import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User space crons.
  crons: defineTable({
    name: v.optional(v.string()), // optional name
    functionHandle: v.string(), // function to run
    args: v.any(), // args as an object
    schedule: v.union(
      v.object({
        kind: v.literal("interval"),
        ms: v.float64(), // milliseconds
      }),
      v.object({
        kind: v.literal("cron"),
        cronspec: v.string(), // "* * * * *"
      })
    ),
    schedulerJobId: v.optional(v.id("_scheduled_functions")), // job to wait for the next execution
    executionJobId: v.optional(v.id("_scheduled_functions")), // async job to run the function
  }).index("name", ["name"]),
});
