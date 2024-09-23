// Example of using the Crons component to register a cron job.

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { Crons } from "@convex-dev/crons";

const crons = new Crons(components.crons);

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
export const registerDailyCron = internalMutation({
  handler: async (ctx) => {
    if ((await crons.get(ctx, { name: "exampleDailyCron" })) === null) {
      await crons.register(
        ctx,
        { kind: "cron", cronspec: "0 0 * * *" },
        internal.init.exampleCron,
        {
          message: "unnecessary daily log message!",
        },
        "exampleDailyCron"
      );
    }
  },
});
