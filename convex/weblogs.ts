// Simple log service that listens to POST requests and writes the message to
// the log.

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { httpAction, internalMutation, query } from "./_generated/server";

export const log = httpAction(async (ctx, request) => {
  await ctx.runMutation(internal.weblogs.logInbound, {
    url: request.url,
    method: request.method,
    headers: JSON.stringify(request.headers),
    body: await request.text(),
  });
  return new Response(null, { status: 200 });
});

export const logInbound = internalMutation({
  args: {
    url: v.string(),
    method: v.string(),
    headers: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    ctx.db.insert("inbound_logs", {
      url: args.url,
      method: args.method,
      headers: args.headers,
      body: args.body,
    });
  },
});

export const tailInbound = query({
  handler: async (ctx) => {
    return await ctx.db.query("inbound_logs").order("desc").take(10);
  },
});

export const logOutbound = internalMutation({
  args: {
    url: v.string(),
    method: v.optional(v.string()),
    headers: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.float64(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("outbound_logs", {
      url: args.url,
      method: args.method,
      headers: args.headers,
      body: args.body,
      status: args.status,
      response: args.response,
    });
  },
});

export const tailOutbound = query({
  handler: async (ctx) => {
    return await ctx.db.query("outbound_logs").order("desc").take(10);
  },
});
