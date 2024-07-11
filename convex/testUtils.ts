// Test-only utilities for running functions on a test-only table.

import {
  defineSchema,
  defineTable,
  internalMutationGeneric,
  internalQueryGeneric,
} from "convex/server";
import { v } from "convex/values";
import schema from "./schema";

// This schema doesn't show up in prod since it's not exported from schema.ts
// but is used to instantiate convexTest in test utilities.
export const testSchema = defineSchema({
  ...schema.tables,
  TEST_data: defineTable({
    counter: v.float64(),
  }),
});

// Test functions are defined as Generic so they can use the test-only schema.
export const TEST_reset = internalMutationGeneric({
  handler: async (ctx) => {
    const testData = await ctx.db.query("TEST_data").unique();
    if (testData != null) {
      await ctx.db.delete(testData._id);
    }
  },
});

export const TEST_increment = internalMutationGeneric({
  handler: async (ctx) => {
    const testData = await ctx.db.query("TEST_data").unique();
    if (testData == null) {
      await ctx.db.insert("TEST_data", { counter: 1 });
    } else {
      await ctx.db.patch(testData._id, { counter: testData.counter + 1 });
    }
  },
});

export const TEST_get = internalQueryGeneric({
  handler: async (ctx) => {
    const testData = await ctx.db.query("TEST_data").unique();
    return testData?.counter ?? 0;
  },
});
