// Demo app using userspace crons.

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { cron, list } from "./cronvex";

// Registers a cron to echo to "syslog" periodically.
export const echo = mutation({
  args: {
    message: v.string(),
    cronspec: v.string(),
  },
  handler: async (ctx, args) => {
    await cron(ctx, args.cronspec, internal.demo.syslog, {
      message: args.message,
    });
  },
});

// Write to the log.
export const syslog = internalMutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    ctx.db.insert("syslog", {
      message: args.message,
    });
  },
});

// List all the crons.
export const listCrons = query({
  handler: async (ctx) => {
    return await list(ctx);
  },
});

// Tail the syslog.
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
