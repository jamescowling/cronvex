// Main service code for Cronvex which users userspace crons to schedule
// webhooks.

import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { cron } from "./cronlib";
import { Id } from "./_generated/dataModel";
import { auth } from "./auth";

export const registerCron = mutation({
  args: {
    url: v.string(),
    cronspec: v.string(),
    name: v.optional(v.string()),
    method: v.string(),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId == null) {
      throw new Error("User not found");
    }
    if (args.headers) {
      new Headers(JSON.parse(args.headers)); // validate headers
    }
    const webhookId = await ctx.db.insert("webhooks", {
      userId,
      url: args.url,
      name: args.name,
      method: args.method,
      headers: args.headers,
      body: args.body,
    });
    const cronId = await cron(
      ctx,
      args.cronspec,
      internal.cronvex.callWebhook,
      {
        id: webhookId,
      }
    );
    await ctx.db.patch(webhookId, { cronId });
  },
});

// TODO this naming is confusing vs webhooks.
export const deleteCrons = mutation({
  args: {
    ids: v.array(v.id("webhooks")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId == null) {
      throw new Error("User not found");
    }
    await Promise.all(
      args.ids.map(async (id) => {
        const webhook = await ctx.db.get(id);
        if (webhook == null) {
          throw new Error("Webhook not found");
        }
        if (webhook.userId !== userId) {
          throw new Error("User not authorized to delete webhook");
        }
        if (webhook.cronId == null) {
          throw new Error("Webhook cron not found");
        }
        await ctx.db.delete(webhook.cronId);
        await ctx.db.delete(id);
      })
    );
  },
});

type WebhookWithCronspec = {
  _id: Id<"webhooks">;
  _creationTime: number;
  userId: Id<"users">;
  name?: string | undefined;
  url: string;
  method: string;
  headers?: string | undefined;
  body?: string | undefined;
  cronId?: Id<"crons"> | undefined;
  cronspec?: string;
};

export const listWebhooks = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId == null) {
      throw new Error("User not found");
    }
    const webhooks: WebhookWithCronspec[] = await ctx.db
      .query("webhooks")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(
      webhooks.map(async (webhook) => {
        if (webhook.cronId == null) {
          throw new Error("Webhook cron not found");
        }
        const cron = await ctx.db.get(webhook.cronId);
        if (cron == null) {
          throw new Error("Cron not found");
        }
        webhook.cronspec = cron.cronspec;
      })
    );
    return webhooks;
  },
});

export const callWebhook = internalMutation({
  args: {
    id: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.id);
    if (webhook == null) {
      throw new Error("Webhook not found");
    }
    ctx.scheduler.runAfter(0, internal.cronvex.fetcher, {
      userId: webhook.userId,
      url: webhook.url,
      method: webhook.method,
      headers: webhook.headers,
      body: webhook.body,
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
    const userId = await auth.getUserId(ctx);
    if (userId == null) {
      throw new Error("User not found");
    }
    return await ctx.db
      .query("weblogs")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});
