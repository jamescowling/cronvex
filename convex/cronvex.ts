import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Do the actual work of the cron job.
export const worker = internalMutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: do some actual interesting work
    console.log("Running cron job with message:", args.message);
    ctx.db.insert("syslog", { message: args.message });
  },
});

// Recursively reschedule crons after the desired interval. This function is
// very simple to avoid hitting any user errors that would break the reschduling
// cycle. In theory this could fail if the backend scheduled down so much that
// just this short function times out.
export const cronRunner = internalMutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    ctx.scheduler.runAfter(0, internal.cronvex.worker, {
      message: args.message,
    });
    // TODO: use runAt compensate for runtime of the function
    ctx.scheduler.runAfter(1000 * 60, internal.cronvex.cronRunner, {
      message: args.message,
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
    ctx.db.insert("cronjobs", {
      message: args.message,
      cronspec: args.cronspec,
    });
    ctx.scheduler.runAfter(0, internal.cronvex.cronRunner, {
      message: args.message,
    });
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
