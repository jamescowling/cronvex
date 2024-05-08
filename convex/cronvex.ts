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

// TODO idempotent bootstrap

// TODO will the scheduler fail if it's in the past?
function nextScheduledTime(prevTs: number, cronspec: string) {
  var options = {
    currentDate: new Date(prevTs),
  };
  const interval = parser.parseExpression(cronspec, options);
  const nextTime = interval.next().toDate();
  console.log(`Scheduling next in ${nextTime.getTime() - prevTs}ms`);
  return nextTime;
}

// TODO what to do if this times out and fails?

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
      const nextTime = nextScheduledTime(
        schedulerJob.scheduledTime,
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

type Schedule =
  | { type: "interval"; ms: number }
  | { type: "cron"; cronspec: string };

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
    const cronJobId = await ctx.db.insert("crons", {
      function: functionName,
      args,
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
    cronspec: schedule.cronspec,
  });
  const schedulerJobId = await ctx.scheduler.runAt(
    nextScheduledTime(new Date().getTime(), schedule.cronspec),
    internal.cronvex.rescheduler,
    {
      cronJobId,
    }
  );
  await ctx.db.patch(cronJobId, { schedulerJobId });
  return cronJobId;
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
 * @param cronspec - Cron string like `"15 7 * * *"` (Every day at 7:15 UTC)
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 */
export async function cron<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronspec: string,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  parser.parseExpression(cronspec);
  return await scheduleCron(
    ctx,
    { cronspec, type: "cron" },
    functionReference,
    ...args
  );
}

export async function list(ctx: QueryCtx) {
  return await ctx.db.query("crons").collect();
}

export async function get(ctx: QueryCtx, cronJobId: Id<"crons">) {
  return await ctx.db.get(cronJobId);
}

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
