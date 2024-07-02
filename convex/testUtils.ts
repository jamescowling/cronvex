import { internalMutation, internalQuery } from "./_generated/server";

export const testReset = internalMutation({
  handler: async (ctx) => {
    console.log("testReset");
    const meta = await ctx.db.query("testData").unique();
    if (meta != null) {
      console.log("counter = 0");
      await ctx.db.delete(meta._id);
    }
  },
});

export const testIncrement = internalMutation({
  handler: async (ctx) => {
    console.log("testIncrement");
    const meta = await ctx.db.query("testData").unique();
    if (meta == null) {
      console.log("counter = 1");
      await ctx.db.insert("testData", { counter: 1 });
    } else {
      console.log(`counter = ${meta.counter + 1}`);
      await ctx.db.patch(meta._id, { counter: meta.counter + 1 });
    }
  },
});

export const testGet = internalQuery({
  handler: async (ctx) => {
    console.log("testGet");
    const allMeta = await ctx.db.query("testData").collect();
    console.log(`allMeta = ${JSON.stringify(allMeta)}`);
    // Sometimes there are two rows in testData...
    const meta = await ctx.db.query("testData").unique();
    return meta?.counter ?? 0;
  },
});
