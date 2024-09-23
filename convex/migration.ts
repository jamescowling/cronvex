import { Crons } from "@convex-dev/crons";
import { internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";

const crons = new Crons(components.crons);

export const migrate = internalMutation({
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").collect();
    for (const job of jobs) {
      const oldCronId = job.cronId!;
      const oldCron = await ctx.db.get(oldCronId);
      if (!oldCron) {
        throw new Error("Cron not found");
      }
      const userId = job.userId;
      const jobId = await ctx.db.insert("requests", {
        userId,
        url: job.url,
        name: job.name,
        method: job.method,
        headers: job.headers,
        body: job.body,
      });
      const newCronId = await crons.register(
        ctx,
        oldCron.schedule,
        internal.cronvex.callWebhook,
        { id: jobId }
      );
      await ctx.db.patch(jobId, { cronId: newCronId });
    }
  },
});
