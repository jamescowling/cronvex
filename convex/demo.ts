import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { interval } from "./cronvex";

export const dummy = internalMutation({
  args: { message: v.string(), interval: v.float64() },
  handler: async (ctx, args) => {
    ctx.db.insert("syslog", {
      message: `${args.message} [every ${args.interval} ms]`,
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

    await interval(ctx, 30 * 1000, internal.demo.dummy, {
      message: args.message,
      interval: 30,
    });
  },
});

// TODO hmm how will i implement the subscription across the "component" boundary
export const listCrons = query({
  handler: async (ctx) => {
    return [];
    // const crons = await ctx.db.query("cronjobs").collect();
    // return crons.map((cron) => ({
    //   message: cron.message,
    //   cronspec: cron.cronspec,
    // }));
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
