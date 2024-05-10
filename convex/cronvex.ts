// Implementation of crons in userspace.

import {
  FunctionReference,
  OptionalRestArgs,
  SchedulableFunctionReference,
  getFunctionName,
  makeFunctionReference,
} from "convex/server";
import { v, Value } from "convex/values";
import { parseArgs } from "./common";
import { MutationCtx, QueryCtx, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import parser from "cron-parser";

// TODO check if the scheduler will fail if we try to schedule in the past

// TODO probably want to add some kind of lightweight should-never-fail janitor
// job which checks if any rescheduler runs failed and reschedules them

/**
 * Schedule a mutation or action to run on a recurring basis.
 *
 * Like the unix command `cron`, Sunday is 0, Monday is 1, etc.
 *
 * ```
 *  *  *  *  *  *  *
 *  ┬  ┬  ┬  ┬  ┬  ┬
 *  │  │  │  │  │  |
 *  │  │  │  │  │  └── day of week (0 - 7, 1L - 7L) (0 or 7 is Sun)
 *  │  │  │  │  └───── month (1 - 12)
 *  │  │  │  └──────── day of month (1 - 31, L)
 *  │  │  └─────────── hour (0 - 23)
 *  │  └────────────── minute (0 - 59)
 *  └───────────────── second (0 - 59, optional)
 * ```
 *
 * @param ctx - Caller mutation context.
 * @param cronspec - Cron string like `"15 7 * * *"` (Every day at 7:15 UTC)
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 * @returns The ID of the cron job.
 */
export async function cron<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronspec: string,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  return await scheduleCron(
    ctx,
    { cronspec, type: "cron" },
    functionReference,
    undefined,
    ...args
  );
}

/**
 * Schedule a mutation or action with the given unique name to run on a recurring basis.
 *
 * Will throw an error if a cron job with the same name already exists.
 *
 * @param ctx - Caller mutation context.
 * @param name - Unique name for the cron job.
 * @param cronspec - Cron string like `"15 7 * * *"` (Every day at 7:15 UTC)
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 * @returns The ID of the cron job.
 */
export async function cronWithName<
  FuncRef extends SchedulableFunctionReference
>(
  ctx: MutationCtx,
  name: string,
  cronspec: string,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  return await scheduleCron(
    ctx,
    { cronspec, type: "cron" },
    functionReference,
    name,
    ...args
  );
}

/**
 * Schedule a mutation or action to run on the given interval.
 *
 * ```js
 * await interval(ctx, 30 * 1000, api.presence.clear);
 * ```
 *
 * @param ctx - Caller mutation context.
 * @param ms - The time in ms between runs for this scheduled job, >= 1000.
 * @param func - A {@link FunctionReference} for the function to schedule.
 * @param args - Any arguments to the function.
 * @returns The ID of the cron job.
 */
export async function interval<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  ms: number,
  func: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  return await scheduleCron(
    ctx,
    { type: "interval", ms },
    func,
    undefined,
    ...args
  );
}

/**
 * Schedule a mutation or action with the given unique name to run on the given
 * interval .
 *
 * Will throw an error if a cron job with the same name already exists.
 *
 * @param ctx - Caller mutation context.
 * @param name - Unique name for the cron job.
 * @param ms - The time in ms between runs for this scheduled job, >= 1000.
 * @param func - A {@link FunctionReference} for the function to schedule.
 * @param args - Any arguments to the function.
 * @returns The ID of the cron job.
 */
export async function intervalWithName<
  FuncRef extends SchedulableFunctionReference
>(
  ctx: MutationCtx,
  name: string,
  ms: number,
  func: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  return await scheduleCron(ctx, { type: "interval", ms }, func, name, ...args);
}

/**
 * List all userspace cron jobs.
 *
 * @param ctx - Caller query context.
 * @returns List of `cron` table rows.
 */
export async function list(ctx: QueryCtx) {
  return await ctx.db.query("crons").collect();
}

/**
 * Get an existing cron job by id.
 *
 * @param ctx - Caller query context.
 * @param cronJobId  - ID of the cron job.
 * @returns Cron job document.
 */
export async function get(ctx: QueryCtx, cronJobId: Id<"crons">) {
  return await ctx.db.get(cronJobId);
}

/**
 * Get an existing cron job by name.
 * `name` is optional and unique for cron jobs.
 *
 * @param ctx - Caller query context.
 * @param name  - Name of the cron job.
 * @returns Cron job document.
 */
export async function getByName(ctx: QueryCtx, name: string) {
  return await ctx.db
    .query("crons")
    .withIndex("name", (q) => q.eq("name", name))
    .unique();
}

/**
 * Delete and deschedule a cron job by id.
 *
 * @param ctx - Caller mutation context.
 * @param cronJobId - ID of the cron job.
 */
export async function del(ctx: MutationCtx, cronJobId: Id<"crons">) {
  const cronJob = await ctx.db.get(cronJobId);
  if (!cronJob) {
    throw new Error(`Cron job ${cronJobId} not found`);
  }
  if (!cronJob.schedulerJobId) {
    throw new Error(`Cron job ${cronJobId} not scheduled`);
  }
  ctx.scheduler.cancel(cronJob.schedulerJobId);
  if (cronJob.executionJobId) {
    await ctx.scheduler.cancel(cronJob.executionJobId);
  }
  await ctx.db.delete(cronJobId);
}

/**
 * Delete and deschedule a cron job by name.
 *
 * @param ctx - Caller mutation context.
 * @param name - Name of the cron job.
 */
export async function delByName(ctx: MutationCtx, name: string) {
  const cronJob = await getByName(ctx, name);
  if (!cronJob) {
    throw new Error(`Cron job ${name} not found`);
  }
  await del(ctx, cronJob._id);
}

// The two types of crons.
type Schedule =
  | { type: "interval"; ms: number }
  | { type: "cron"; cronspec: string };

// Initial registration and scheduling of the cron job.
async function scheduleCron(
  ctx: MutationCtx,
  schedule: Schedule,
  func: SchedulableFunctionReference,
  name?: string,
  args?: Record<string, Value>
) {
  // Input validation
  if (name && (await getByName(ctx, name))) {
    throw new Error(`Cron job with name ${name} already exists`);
  }
  if (schedule.type === "interval" && schedule.ms < 1000) {
    throw new Error("Interval must be >= 1000ms"); // Just a sanity check.
  }
  if (schedule.type === "cron" && !parser.parseExpression(schedule.cronspec)) {
    throw new Error(`Invalid cronspec: ${schedule.cronspec}`);
  }

  args = parseArgs(args);
  const functionName = getFunctionName(func);

  if (schedule.type === "interval") {
    const cronJobId = await ctx.db.insert("crons", {
      function: functionName,
      args,
      name,
      ms: schedule.ms,
    });
    console.log(
      `Scheduling ${args.function}(${args.args}) every ${schedule.ms} ms`
    );
    const schedulerJobId = await ctx.scheduler.runAfter(
      schedule.ms,
      internal.cronvex.rescheduler,
      {
        cronJobId,
      }
    );
    await ctx.db.patch(cronJobId, { schedulerJobId });
    return cronJobId;
  }

  const cronJobId = await ctx.db.insert("crons", {
    function: functionName,
    args,
    name,
    cronspec: schedule.cronspec,
  });
  const schedulerJobId = await ctx.scheduler.runAt(
    nextScheduledDate(new Date(), schedule.cronspec),
    internal.cronvex.rescheduler,
    {
      cronJobId,
    }
  );
  await ctx.db.patch(cronJobId, { schedulerJobId });
  return cronJobId;
}

// Continue rescheduling a cron job.
//
// This is the main worker function that does the scheduling but also schedules
// the target function so that it runs in a different context. As a result this
// function probably *shouldn't* fail since it isn't doing much, but under heavy
// OCC contention it's possible it may eventually fail. In this case the cron
// will be lost and we'll need a janitor job to recover it.
export const rescheduler = internalMutation({
  args: {
    cronJobId: v.id("crons"),
  },
  handler: async (ctx, args) => {
    // Cron job is the logical concept we're rescheduling repeatedly.
    const cronJob = await ctx.db.get(args.cronJobId);
    if (!cronJob) {
      throw Error(`Cron job ${args.cronJobId} not found`);
    }
    if (!cronJob.schedulerJobId) {
      throw Error(`Cron job ${args.cronJobId} not scheduled`);
    }

    // Scheduler job is the job that's running right now, that we use to trigger
    // repeated executions.
    const schedulerJob = await ctx.db.system.get(cronJob.schedulerJobId);
    if (!schedulerJob) {
      throw Error(`Scheduled job ${cronJob.schedulerJobId} not found`);
    }
    if (schedulerJob.state.kind !== "pending") {
      throw Error(
        `We are running in job ${schedulerJob._id} but state is ${schedulerJob.state.kind}`
      );
    }

    // Execution job is the previous job used to actually do the work of the cron.
    const cronFunction = makeFunctionReference<"mutation" | "action">(
      cronJob.function
    );
    var stillRunning = false;
    if (cronJob.executionJobId) {
      const executionJob = await ctx.db.system.get(cronJob.executionJobId);
      if (
        executionJob &&
        (executionJob.state.kind === "pending" ||
          executionJob.state.kind === "inProgress")
      ) {
        stillRunning = true;
      }
    }
    if (stillRunning) {
      console.log(`Cron ${cronJob._id} still running, skipping this run.`);
    } else {
      console.log(`Running cron job ${cronJob._id}: ${cronJob.function}`);
      await ctx.scheduler.runAfter(0, cronFunction, cronJob.args);
    }

    // Now reschedule the next run.
    if (cronJob.ms) {
      const nextTime = schedulerJob.scheduledTime + cronJob.ms;
      const nextSchedulerJobId = await ctx.scheduler.runAt(
        nextTime,
        internal.cronvex.rescheduler,
        {
          cronJobId: args.cronJobId,
        }
      );
      await ctx.db.patch(args.cronJobId, {
        schedulerJobId: nextSchedulerJobId,
      });
    } else if (cronJob.cronspec) {
      const nextTime = nextScheduledDate(
        new Date(schedulerJob.scheduledTime),
        cronJob.cronspec
      );
      const nextSchedulerJobId = await ctx.scheduler.runAt(
        nextTime,
        internal.cronvex.rescheduler,
        {
          cronJobId: args.cronJobId,
        }
      );
      await ctx.db.patch(args.cronJobId, {
        schedulerJobId: nextSchedulerJobId,
      });
    } else {
      throw new Error("Cron job must have either ms or cronspec");
    }
  },
});

// Calculate the next date to run a cron given the last time it was scheduled.
function nextScheduledDate(prevDate: Date, cronspec: string) {
  var options = {
    currentDate: prevDate,
  };
  const interval = parser.parseExpression(cronspec, options);
  return interval.next().toDate();
}
