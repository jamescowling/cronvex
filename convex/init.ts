// import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
// import { cronWithName, getByName } from "./cronvex";

// This is an idempotent bootstrap script that can be used to set up crons
// similarly to the old crons.ts file. It needs to be run manually, e.g., by
// running `convex dev --run init`.
export default internalMutation({
  handler: async (ctx) => {
    // TODO change this to register an actual cron
    // if ((await getByName(ctx, "daily")) == null) {
    //   await cronWithName(
    //     ctx,
    //     "daily",
    //     "0 0 * * *",
    //     internal.weblogs.logInbound,
    //     {
    //       message: "daily cron",
    //     }
    //   );
    // }
  },
});
