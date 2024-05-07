import {
  FunctionReference,
  OptionalRestArgs,
  SchedulableFunctionReference,
  getFunctionName,
  makeFunctionReference,
} from "convex/server";
import { v, Value } from "convex/values";
import { parseArgs } from "./common";
import { MutationCtx, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// TODO ability to change a cron
// TODO ability to delete a cron
// TODO ability to list all crons
// TODO idempotent bootstrap

function nextScheduledTime(cronspec: string) {
  // TODO implement
  throw new Error("Not implemented");
  return new Date();
}

// Recursively reschedule crons after the desired interval. This function is
// very simple to avoid hitting any user errors that would break the reschduling
// cycle. In theory this could fail if the backend scheduled down so much that
// just this short function times out.
export const cronRunner = internalMutation({
  args: {
    function: v.string(),
    args: v.any(),
    ms: v.optional(v.float64()),
    cronspec: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Running cron job ${args.function}(${args.args})`);

    const func = makeFunctionReference<"mutation" | "action">(args.function);
    ctx.scheduler.runAfter(0, func, args.args);

    // TODO: use runAt compensate for runtime of the function

    if (args.ms) {
      ctx.scheduler.runAfter(args.ms, internal.cronvex.cronRunner, {
        function: args.function,
        args: args.args,
        ms: args.ms,
      });
    } else if (args.cronspec) {
      ctx.scheduler.runAt(
        nextScheduledTime(args.cronspec),
        internal.cronvex.cronRunner,
        {
          function: args.function,
          args: args.args,
          cronspec: args.cronspec,
        }
      );
    } else {
      throw new Error("Cron job must have either seconds or cronspec");
    }
  },
});

type Schedule =
  | { type: "interval"; ms: number }
  | { type: "cron"; cron: string };

/**
 * A class for scheduling cron jobs.
 *
 * To learn more see the documentation at https://docs.convex.dev/scheduling/cron-jobs
 *
 * @public
 */

/** @internal */
async function scheduleCron(
  ctx: MutationCtx,
  schedule: Schedule,
  func: SchedulableFunctionReference,
  args?: Record<string, Value>
) {
  args = parseArgs(args);
  const functionName = getFunctionName(func);

  if (schedule.type === "interval") {
    const jobId = await ctx.db.insert("crons", {
      function: functionName,
      args,
      ms: schedule.ms,
    });
    console.log(
      `Scheduling ${args.function}(${args.args}) every ${schedule.ms} ms`
    );
    ctx.scheduler.runAfter(schedule.ms, internal.cronvex.cronRunner, {
      function: functionName,
      args,
      ms: schedule.ms,
    });
    return jobId;
  }

  const jobId = await ctx.db.insert("crons", {
    function: functionName,
    args,
    cronspec: schedule.cron,
  });
  ctx.scheduler.runAt(
    nextScheduledTime(schedule.cron),
    internal.cronvex.cronRunner,
    {
      function: functionName,
      args,
      cronspec: schedule.cron,
    }
  );
  return jobId;
}

/**
 * Schedule a mutation or action to run on the given interval.
 *
 * ```js
 * await interval(ctx, "Clear presence data", 30, api.presence.clear);
 * ```
 *
 * @param ctx - The mutation context.
 * @param ms - The time in ms between runs for this scheduled job, >= 1000.
 * @param func - A {@link FunctionReference} for the function to schedule.
 * @param args - Any arguments to the function.
 */
export async function interval<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  ms: number,
  func: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  if (ms < 1000) {
    throw new Error("Interval must be >= 1000ms");
  }
  return await scheduleCron(ctx, { type: "interval", ms }, func, ...args);
}

/**
 * Schedule a mutation or action to run on a recurring basis.
 *
 * Like the unix command `cron`, Sunday is 0, Monday is 1, etc.
 *
 * ```
 *  ┌─ minute (0 - 59)
 *  │ ┌─ hour (0 - 23)
 *  │ │ ┌─ day of the month (1 - 31)
 *  │ │ │ ┌─ month (1 - 12)
 *  │ │ │ │ ┌─ day of the week (0 - 6) (Sunday to Saturday)
 * "* * * * *"
 * ```
 *
 * @param ctx - The mutation context.
 * @param cron - Cron string like `"15 7 * * *"` (Every day at 7:15 UTC)
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 */
async function cron<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cron: string,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  if (!isValidCron(cron)) {
    throw new Error(`Invalid cron string: ${cron}`);
  }

  return await scheduleCron(
    ctx,
    { cron: cron, type: "cron" },
    functionReference,
    ...args
  );
}
