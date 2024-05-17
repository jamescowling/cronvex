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
    method: v.optional(v.string()),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  method?: string | undefined;
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
    method: v.optional(v.string()),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO we should parse this closer to the user input
    const method = args.method || "POST";
    const headers = new Headers(JSON.parse(args.headers || "{}"));
    const response = await fetch(args.url, {
      method,
      headers,
      body: args.body,
    });
    await ctx.runMutation(internal.weblogs.logOutbound, {
      url: args.url,
      method,
      headers: args.headers,
      body: args.body,
      status: response.status,
      response: await response.text(),
    });
  },
});
