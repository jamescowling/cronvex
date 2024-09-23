import { internalMutation } from "./_generated/server";

export const migrate = internalMutation({
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();

    for (const r of requests) {
      await ctx.db.insert("jobs", r);
    }
  },
});
