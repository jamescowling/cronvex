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
import { cron, list } from "./cronlib";
import { Id } from "./_generated/dataModel";

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
    if (args.headers) {
      new Headers(JSON.parse(args.headers)); // validate headers
    }
    const webhookId = await ctx.db.insert("webhooks", {
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
    await ctx.db.patch(webhookId, { cron: cronId });
  },
});

// List all the crons.
export const listCrons = query({
  handler: async (ctx) => {
    return await list(ctx);
  },
});

type WebhookWithCronspec = {
  _id: Id<"webhooks">;
  _creationTime: number;
  name?: string | undefined;
  method: string;
  headers?: string | undefined;
  body?: string | undefined;
  cron?: Id<"crons"> | undefined;
  url: string;
  cronspec?: string;
};

export const listWebhooks = query({
  handler: async (ctx) => {
    const webhooks: WebhookWithCronspec[] = await ctx.db
      .query("webhooks")
      .collect();
    await Promise.all(
      webhooks.map(async (webhook) => {
        if (webhook.cron == null) {
          throw new Error("Webhook cron not found");
        }
        const cron = await ctx.db.get(webhook.cron);
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
      url: webhook.url,
      method: webhook.method,
      headers: webhook.headers,
      body: webhook.body,
    });
  },
});

export const fetcher = internalAction({
  args: {
    url: v.string(),
    method: v.string(),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { url, method, headers, body }) => {
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

    await ctx.runMutation(internal.weblogs.logOutbound, {
      url,
      method,
      headers,
      body,
      status: responseStatus,
      response: responseBody,
    });
  },
});
