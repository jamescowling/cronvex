import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { cron, interval, list } from "./cronvex";

export const echo = mutation({
  args: {
    message: v.string(),
    cronspec: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO change to actually using cronspec
    await cron(ctx, "* $ *H* *", internal.demo.syslog, {
      message: args.message,
    });
  },
});

export const syslog = internalMutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    // TODO add users
    ctx.db.insert("syslog", {
      message: args.message,
    });
  },
});

export const listCrons = query({
  handler: async (ctx) => {
    return await list(ctx);
  },
});

export const tailSyslog = query({
  handler: async (ctx) => {
    const logs = await ctx.db.query("syslog").order("desc").take(10);
    logs.reverse();
    return logs.map((log) => ({
      message: log.message,
      time: new Date(log._creationTime).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    }));
  },
});
