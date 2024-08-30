import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { components } from "./_generated/server";
import { createFunctionHandle } from "convex/server";

export const exampleCron = internalMutation({
  args: {
    message: v.string(),
  },
  handler: async (_ctx, { message }) => {
    console.log(message);
  },
});

// This is an idempotent bootstrap script that can be used to set up crons
// similarly to the old crons.ts file. It needs to be run manually, e.g., by
// running `convex dev --run init`.
export default internalMutation({
  handler: async (ctx) => {
    if (
      (await ctx.runQuery(components.crons.lib.getByName, {
        name: "exampleDailyCron",
      })) == null
    ) {
      await ctx.runMutation(components.crons.lib.registerCron, {
        name: "exampleDailyCron",
        cronspec: "0 0 * * *",
        functionHandle: await createFunctionHandle(internal.init.exampleCron),
        args: {
          message: "unnecessary daily log message!",
        },
      });
    }
  },
});
