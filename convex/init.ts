import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { cronWithName, getByName } from "./cronlib";

export const exampleCron = internalMutation({
  args: {
    message: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log(args.message);
  },
});

// This is an idempotent bootstrap script that can be used to set up crons
// similarly to the old crons.ts file. It needs to be run manually, e.g., by
// running `convex dev --run init`.
export default internalMutation({
  handler: async (ctx) => {
    if ((await getByName(ctx, "exampleDailyCron")) == null) {
      await cronWithName(
        ctx,
        "exampleDailyCron",
        "0 0 * * *",
        internal.init.exampleCron,
        {
          message: "unnecessary daily log message!",
        }
      );
    }
  },
});
