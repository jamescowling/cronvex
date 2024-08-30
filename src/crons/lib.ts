// Implementation of crons in user space.
//
// Crons can be registered at runtime via the `registerCron` or
// `registerInterval` mutations.
//
// If you'd like to statically define cronjobs like in the built-in `crons.ts`
// Convex feature you can do so via an init script that idempotently registers a
// cron with a given name. e.g., in an `init.ts` file that gets run on every
// deploy via `convex dev --run init`:
//
// if ((await ctx.runQuery(components.crons.lib.getByName, { name: "daily" })) == null) {
//   await ctx.runMutation(components.crons.lib.registerCron, {
//     name: "daily",
//     cronspec: "0 0 * * *",
//     functionHandle: await createFunctionHandle(internal.whatever.myFunctionName)
//     args: { message: "daily cron" },
//   });
// }

import { FunctionHandle } from "convex/server";
import { v, Value } from "convex/values";
import { parseArgs } from "./parseArgs";
import {
  MutationCtx,
  mutation,
  query,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import parser from "cron-parser";
import { Doc } from "./_generated/dataModel";

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
 * @param name - Optional unique name for the cron job. Will throw if a name is
 * provided and a cron with the same name already exists.
 * @param cronspec - Cron string like `"15 7 * * *"` (Every day at 7:15 UTC)
 * @param functionHandle - A {@link FunctionHandle} string for the function to schedule.
 * @param args - The arguments to the function.
 * @returns The ID of the cron job.
 */
export const registerCron = mutation({
  args: {
    name: v.optional(v.string()),
    cronspec: v.string(),
    functionHandle: v.string(),
    args: v.any(),
  },
  handler: async (ctx, { name, cronspec, functionHandle, args }) => {
    return await scheduleCron(
      ctx,
      { cronspec: cronspec, kind: "cron" },
      functionHandle as FunctionHandle<"mutation" | "action">,
      name,
      args
    );
  },
});

/**
 * Schedule a mutation or action to run on the given interval.
 *
 * @param name - Optional unique name for the cron job. Will throw if a name is
 * provided and a cron with the same name already exists.
 * @param ms - The time in ms between runs for this scheduled job, >= 1000.
 * @param functionHandle - A {@link FunctionHandle} string for the function to schedule.
 * @param args - Any arguments to the function.
 * @returns The ID of the cron job.
 */
export const registerInterval = mutation({
  args: {
    name: v.optional(v.string()),
    ms: v.float64(),
    functionHandle: v.string(),
    args: v.any(),
  },
  handler: async (ctx, { name, ms, functionHandle, args }) => {
    return await scheduleCron(
      ctx,
      { kind: "interval", ms },
      functionHandle as FunctionHandle<"mutation" | "action">,
      name,
      args
    );
  },
});

/**
 * List all user space cron jobs.
 *
 * @returns List of `cron` table rows.
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("crons").collect();
  },
});

/**
 * Get an existing cron job by id.
 *
 * @param id  - ID of the cron job.
 * @returns Cron job document.
 */
export const get = query({
  args: {
    id: v.id("crons"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Get an existing cron job by name.
 *
 * @param name  - Name of the cron job.
 * @returns Cron job document.
 */
export const getByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("crons")
      .withIndex("name", (q) => q.eq("name", name))
      .unique();
  },
});

/**
 * Delete and deschedule a cron job by id.
 *
 * @param id - ID of the cron job.
 */
export const del = mutation({
  args: {
    id: v.id("crons"),
  },
  handler: async (ctx, { id }) => {
    const cron = await ctx.db.get(id);
    if (!cron) {
      throw new Error(`Cron ${id} not found`);
    }
    await delCron(ctx, cron);
  },
});

/**
 * Delete and deschedule a cron job by name.
 *
 * @param name - Name of the cron job.
 */
export const delByName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const cron = await ctx.db
      .query("crons")
      .withIndex("name", (q) => q.eq("name", name))
      .unique();
    if (!cron) {
      throw new Error(`Cron "${name}" not found`);
    }
    await delCron(ctx, cron);
  },
});

async function delCron(ctx: MutationCtx, cron: Doc<"crons">) {
  if (!cron.schedulerJobId) {
    throw new Error(`Cron ${cron._id} not scheduled`);
  }
  console.log(`Canceling scheduler job ${cron.schedulerJobId}`);
  await ctx.scheduler.cancel(cron.schedulerJobId);
  if (cron.executionJobId) {
    console.log(`Canceling execution job ${cron.executionJobId}`);
    await ctx.scheduler.cancel(cron.executionJobId);
  }
  console.log(`Deleting cron ${cron._id}`);
  await ctx.db.delete(cron._id);
}

// The two types of crons.
type Schedule =
  | { kind: "interval"; ms: number }
  | { kind: "cron"; cronspec: string };

// Initial registration and scheduling of the cron job.
async function scheduleCron(
  ctx: MutationCtx,
  schedule: Schedule,
  functionHandle: FunctionHandle<"mutation" | "action">,
  name?: string,
  args?: Record<string, Value>
) {
  // Input validation
  if (
    name &&
    (await ctx.db
      .query("crons")
      .withIndex("name", (q) => q.eq("name", name))
      .unique())
  ) {
    throw new Error(`Cron with name "${name}" already exists`);
  }
  if (schedule.kind === "interval" && schedule.ms < 1000) {
    throw new Error("Interval must be >= 1000ms"); // Just a sanity check.
  }
  if (schedule.kind === "cron") {
    try {
      parser.parseExpression(schedule.cronspec);
    } catch {
      throw new Error(`Invalid cronspec: "${schedule.cronspec}"`);
    }
  }

  args = parseArgs(args);

  if (schedule.kind === "interval") {
    const id = await ctx.db.insert("crons", {
      functionHandle,
      args,
      name,
      schedule: { kind: "interval", ms: schedule.ms },
    });
    // TODO: add support for extracting the function name from a function handle
    console.log(
      `Scheduling cron with name "${name}" and id ${id} to run ${functionHandle}(${JSON.stringify(args)}) every ${schedule.ms} ms`
    );
    const schedulerJobId = await ctx.scheduler.runAfter(
      schedule.ms,
      internal.lib.rescheduler,
      { id }
    );
    await ctx.db.patch(id, { schedulerJobId });
    return id;
  }

  const id = await ctx.db.insert("crons", {
    functionHandle,
    args,
    name,
    schedule: { kind: "cron", cronspec: schedule.cronspec },
  });
  console.log(
    `Scheduling cron with name "${name}" and id ${id} to run ${functionHandle}(${JSON.stringify(args)}) on cronspec "${schedule.cronspec}"`
  );
  const schedulerJobId = await ctx.scheduler.runAt(
    nextScheduledDate(new Date(), schedule.cronspec),
    internal.lib.rescheduler,
    { id }
  );
  await ctx.db.patch(id, { schedulerJobId });
  return id;
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
    id: v.id("crons"),
  },
  handler: async (ctx, { id }) => {
    // Cron job is the logical concept we're rescheduling repeatedly.
    const cronJob = await ctx.db.get(id);
    if (!cronJob) {
      throw Error(`Cron ${id} not found`);
    }
    if (!cronJob.schedulerJobId) {
      throw Error(`Cron ${id} not scheduled`);
    }

    // Scheduler job is the job that's running right now, that we use to trigger
    // repeated executions.
    const schedulerJob = await ctx.db.system.get(cronJob.schedulerJobId);
    if (!schedulerJob) {
      throw Error(`Scheduler job ${cronJob.schedulerJobId} not found`);
    }
    // XXX The convex-test library runs mutations through the `inProgress` state
    // but the production state machine does not. Remove the `inProgress` allowance
    // once the test library has been updated.
    if (
      schedulerJob.state.kind !== "pending" &&
      schedulerJob.state.kind !== "inProgress"
    ) {
      throw Error(
        `We are running in job ${schedulerJob._id} but state is ${schedulerJob.state.kind}`
      );
    }

    // Execution job is the previous job used to actually do the work of the cron.
    let stillRunning = false;
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
      console.log(`Running cron ${cronJob._id}.`);
      await ctx.scheduler.runAfter(
        0,
        cronJob.functionHandle as FunctionHandle<"mutation" | "action">,
        cronJob.args
      );
    }

    // Now reschedule the next run.
    if (cronJob.schedule.kind === "interval") {
      const nextTime = schedulerJob.scheduledTime + cronJob.schedule.ms;
      const nextSchedulerJobId = await ctx.scheduler.runAt(
        nextTime,
        internal.lib.rescheduler,
        { id }
      );
      await ctx.db.patch(id, { schedulerJobId: nextSchedulerJobId });
    } else {
      const nextTime = nextScheduledDate(
        new Date(schedulerJob.scheduledTime),
        cronJob.schedule.cronspec
      );
      const nextSchedulerJobId = await ctx.scheduler.runAt(
        nextTime,
        internal.lib.rescheduler,
        { id }
      );
      await ctx.db.patch(id, { schedulerJobId: nextSchedulerJobId });
    }
  },
});

// Calculate the next date to run a cron given the last time it was scheduled.
function nextScheduledDate(prevDate: Date, cronspec: string) {
  const options = {
    currentDate: prevDate,
  };
  const interval = parser.parseExpression(cronspec, options);
  return interval.next().toDate();
}
