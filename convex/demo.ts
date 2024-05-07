import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { hourly } from "./cronvex";

export const dummy = internalMutation({
  args: { nonce: v.float64() },
  handler: async (ctx, args) => {
    console.log("Dummy cron job with nonce:", args.nonce);
    ctx.db.insert("syslog", {
      message: `dummy cron job with nonce ${args.nonce}`,
    });
  },
});

export const addCron = mutation({
  args: {
    message: v.string(),
    cronspec: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO add users
    console.log(
      "Adding new cron job with message:",
      args.message,
      "and cronspec:",
      args.cronspec
    );

    await hourly(
      ctx,
      "my even hotter cron",
      { minuteUTC: 0 },
      internal.demo.dummy,
      {
        nonce: 42,
      }
    );
  },
});

export const listCrons = query({
  handler: async (ctx) => {
    const crons = await ctx.db.query("cronjobs").collect();
    return crons.map((cron) => ({
      message: cron.message,
      cronspec: cron.cronspec,
    }));
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
