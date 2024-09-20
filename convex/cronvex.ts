// Main service code for Cronvex which users user space crons to send recurring
// http requests on a cron schedule.

import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Crons } from "@convex-dev/crons";

const crons = new Crons(components.crons);

export const registerJob = mutation({
  args: {
    url: v.string(),
    cronspec: v.string(),
    name: v.optional(v.string()),
    method: v.string(),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("registerJob", args);
    const userId = await getAuthUserId(ctx);
    if (userId == null) {
      throw new Error("User not found");
    }
    if (args.headers) {
      new Headers(JSON.parse(args.headers)); // validate headers
    }
    const jobId = await ctx.db.insert("jobs", {
      userId,
      url: args.url,
      name: args.name,
      method: args.method,
      headers: args.headers,
      body: args.body,
    });
    const cronId = await crons.register(
      ctx,
      {
        kind: "cron",
        cronspec: args.cronspec,
      },
      internal.cronvex.callWebhook,
      { id: jobId },
      args.name
    );
    await ctx.db.patch(jobId, { cronId });
  },
});

export const deleteJobs = mutation({
  args: {
    ids: v.array(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId == null) {
      throw new Error("User not found");
    }
    await Promise.all(
      args.ids.map(async (id) => {
        const job = await ctx.db.get(id);
        if (job == null) {
          throw new Error("Job not found");
        }
        if (job.userId !== userId) {
          throw new Error("User not authorized to delete job");
        }
        if (job.cronId == null) {
          throw new Error("Cron not found");
        }
        await crons.delete(ctx, { id: job.cronId });
        await ctx.db.delete(id);
      })
    );
  },
});

export type JobWithCron = {
  _id: Id<"jobs">;
  _creationTime: number;
  userId: Id<"users">;
  name?: string | undefined;
  url: string;
  method: string;
  headers?: string | undefined;
  body?: string | undefined;
  cronId?: string | undefined;
  cronspec?: string;
};

export const listJobs = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId == null) {
      return [];
    }
    const jobsWithCrons: JobWithCron[] = await ctx.db
      .query("jobs")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(
      jobsWithCrons.map(async (jobWithCron) => {
        if (jobWithCron.cronId == null) {
          throw new Error("Cron not found");
        }
        const cron = await crons.get(ctx, { id: jobWithCron.cronId });
        if (cron == null) {
          throw new Error("Cron not found");
        }
        if (cron.schedule.kind !== "cron") {
          throw new Error("Expected cron schedule");
        }
        jobWithCron.cronspec = cron.schedule.cronspec;
      })
    );
    return jobsWithCrons;
  },
});

export const callWebhook = internalMutation({
  args: {
    id: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (job == null) {
      throw new Error("Job not found");
    }
    await ctx.scheduler.runAfter(0, internal.cronvex.fetcher, {
      userId: job.userId,
      url: job.url,
      method: job.method,
      headers: job.headers,
      body: job.body,
    });
  },
});

export const fetcher = internalAction({
  args: {
    userId: v.id("users"),
    url: v.string(),
    method: v.string(),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { userId, url, method, headers, body }) => {
    const fetchOptions: RequestInit = {
      method,
    };
    if (headers) {
      fetchOptions.headers = new Headers(JSON.parse(headers));
    }
    if (body) {
      fetchOptions.body = body;
    }

    let response: Response | null = null;
    let responseBody: string = "";
    let responseStatus: number | null = null;

    try {
      response = await fetch(url, fetchOptions);
      responseStatus = response.status;
    } catch (error) {
      responseStatus = 500;
      responseBody =
        error instanceof Error
          ? `Fetch error: ${error.message}`
          : "Unknown fetch error";
    }

    if (response) {
      try {
        responseBody = await response.text();
      } catch (error) {
        responseBody =
          error instanceof Error
            ? `Error reading response text: ${error.message}`
            : "Unknown error reading response text";
      }
    }

    await ctx.runMutation(internal.cronvex.log, {
      userId,
      url,
      method,
      headers,
      body,
      status: responseStatus,
      response: responseBody,
    });
  },
});

export const log = internalMutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
    method: v.string(),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.float64(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("weblogs", {
      userId: args.userId,
      url: args.url,
      method: args.method,
      headers: args.headers,
      body: args.body,
      status: args.status,
      response: args.response,
    });
  },
});

export const tailLogs = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId == null) {
      return [];
    }
    return await ctx.db
      .query("weblogs")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});
