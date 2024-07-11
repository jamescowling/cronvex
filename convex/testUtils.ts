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
    flakyCounter: v.float64(),
    slowCounter: v.float64(),
  }),
});

// Test functions are defined as Generic so they can use the test-only schema.
export const TEST_reset = internalMutationGeneric({
  handler: async (ctx) => {
    const testData = await ctx.db.query("TEST_data").unique();
    if (testData != null) {
      await ctx.db.delete(testData._id);
    }
    await ctx.db.insert("TEST_data", {
      counter: 0,
      flakyCounter: 0,
      slowCounter: 0,
    });
  },
});

export const TEST_increment = internalMutationGeneric({
  handler: async (ctx) => {
    console.log("running TEST_increment");
    const testData = await ctx.db.query("TEST_data").unique();
    if (testData == null) {
      throw new Error("No test data");
    }
    await ctx.db.patch(testData._id, { counter: testData.counter + 1 });
  },
});

export const TEST_get = internalQueryGeneric({
  handler: async (ctx) => {
    const testData = await ctx.db.query("TEST_data").unique();
    if (testData == null) {
      throw new Error("No test data");
    }
    return testData;
  },
});

export const TEST_flake = internalMutationGeneric({
  handler: async (ctx) => {
    const testData = await ctx.db.query("TEST_data").unique();
    if (testData == null) {
      throw new Error("No test data");
    }
    if (testData.counter % 2 === 0) {
      throw new Error("Flake");
    } else {
      await ctx.db.patch(testData._id, {
        flakyCounter: testData.flakyCounter + 1,
      });
    }
  },
});

export const TEST_slow = internalMutationGeneric({
  handler: async (ctx) => {
    const testData = await ctx.db.query("TEST_data").unique();
    if (testData == null) {
      throw new Error("No test data");
    }
    await ctx.db.patch(testData._id, { slowCounter: testData.slowCounter + 1 });
    await new Promise((resolve) => setTimeout(resolve, 1100));
  },
});
