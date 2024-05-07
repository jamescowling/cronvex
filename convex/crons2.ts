import {
  FunctionReference,
  OptionalRestArgs,
  SchedulableFunctionReference,
  getFunctionName,
  makeFunctionReference,
} from "convex/server";
import { JSONValue, v, Value } from "convex/values";
import { parseArgs } from "./common";
import { MutationCtx, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Recursively reschedule crons after the desired interval. This function is
// very simple to avoid hitting any user errors that would break the reschduling
// cycle. In theory this could fail if the backend scheduled down so much that
// just this short function times out.
export const cronRunner = internalMutation({
  args: {
    name: v.string(),
    function: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    // TODO now need to parge the schedule and use it to decide how often to run

    // TODO how do i do this without knowing the function type?
    const func = makeFunctionReference<"mutation">(args.function);
    ctx.scheduler.runAfter(0, func, args.args);
    console.log(
      `Running cron job ${args.name} with function ${args.function} and args ${args.args}`
    );
    // TODO: use runAt compensate for runtime of the function
    ctx.scheduler.runAfter(1000 * 60, internal.crons2.cronRunner, {
      name: args.name,
      function: args.function,
      args: args.args,
    });
  },
});

type CronSchedule = {
  type: "cron";
  cron: string;
};
/** @public */
export type IntervalSchedule =
  | { type: "interval"; seconds: number }
  | { type: "interval"; minutes: number }
  | { type: "interval"; hours: number };
/** @public */
export type HourlySchedule = {
  type: "hourly";
  minuteUTC: number;
};
/** @public */
export type DailySchedule = {
  type: "daily";
  hourUTC: number;
  minuteUTC: number;
};
const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
/** @public */
export type WeeklySchedule = {
  type: "weekly";
  dayOfWeek: DayOfWeek;
  hourUTC: number;
  minuteUTC: number;
};
/** @public */
export type MonthlySchedule = {
  type: "monthly";
  day: number;
  hourUTC: number;
  minuteUTC: number;
};

// Duplicating types so docstrings are visible in signatures:
// `Expand<Omit<MonthlySchedule, "type">>` doesn't preserve docstrings.
// When we get to TypeScript 4.9, `satisfies` would go nicely here.

/** @public */
export type Interval =
  | {
      /**
       * Run a job every `seconds` seconds, beginning
       * when the job is first deployed to Convex.
       */
      seconds: number;
      minutes?: undefined;
      hours?: undefined;
    }
  | {
      /**
       * Run a job every `minutes` minutes, beginning
       * when the job is first deployed to Convex.
       */
      minutes: number;
      seconds?: undefined;
      hours?: undefined;
    }
  | {
      /**
       * Run a job every `hours` hours, beginning when
       * when the job is first deployed to Convex.
       */
      hours: number;
      seconds?: undefined;
      minutes?: undefined;
    };

/** @public */
export type Hourly = {
  /**
   * Minutes past the hour, 0-59.
   */
  minuteUTC: number;
};

/** @public */
export type Daily = {
  /**
   * 0-23, hour of day. Remember, this is UTC.
   */
  hourUTC: number;
  /**
   * 0-59, minute of hour. Remember, this is UTC.
   */
  minuteUTC: number;
};

/** @public */
export type Monthly = {
  /**
   * 1-31, day of month. Days greater that 28 will not run every month.
   */
  day: number;
  /**
   * 0-23, hour of day. Remember to convert from your own time zone to UTC.
   */
  hourUTC: number;
  /**
   * 0-59, minute of hour. Remember to convert from your own time zone to UTC.
   */
  minuteUTC: number;
};
/** @public */
export type Weekly = {
  /**
   * "monday", "tuesday", etc.
   */
  dayOfWeek: DayOfWeek;
  /**
   * 0-23, hour of day. Remember to convert from your own time zone to UTC.
   */
  hourUTC: number;
  /**
   * 0-59, minute of hour. Remember to convert from your own time zone to UTC.
   */
  minuteUTC: number;
};

/** @public */
export type Schedule =
  | CronSchedule
  | IntervalSchedule
  | HourlySchedule
  | DailySchedule
  | WeeklySchedule
  | MonthlySchedule;

/**
 * A schedule to run a Convex mutation or action on.
 * You can schedule Convex functions to run regularly with
 * {@link interval} and exporting it.
 *
 * @public
 **/
export interface CronJob {
  name: string;
  args: JSONValue;
  schedule: Schedule;
}

/**
 * @public
 *
 * This is a cron string. They're complicated!
 */
type CronString = string;

function validateIntervalNumber(n: number) {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("Interval must be an integer greater than 0");
  }
}

function validatedDayOfMonth(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > 31) {
    throw new Error("Day of month must be an integer from 1 to 31");
  }
  return n;
}

function validatedDayOfWeek(s: string) {
  if (typeof s !== "string" || !DAYS_OF_WEEK.includes(s)) {
    throw new Error('Day of week must be a string like "monday".');
  }
  return s;
}

function validatedHourOfDay(n: number) {
  if (!Number.isInteger(n) || n < 0 || n > 23) {
    throw new Error("Hour of day must be an integer from 0 to 23");
  }
  return n;
}

function validatedMinuteOfHour(n: number) {
  if (!Number.isInteger(n) || n < 0 || n > 59) {
    throw new Error("Minute of hour must be an integer from 0 to 59");
  }
  return n;
}

function validatedCronString(s: string) {
  return s;
}

function validatedCronIdentifier(s: string) {
  if (!s.match(/^[ -~]*$/)) {
    throw new Error(
      `Invalid cron identifier ${s}: use ASCII letters that are not control characters`
    );
  }
  return s;
}

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
  cronIdentifier: string,
  schedule: Schedule,
  functionReference: SchedulableFunctionReference,
  args?: Record<string, Value>
) {
  const cronArgs = parseArgs(args);
  const name = validatedCronIdentifier(cronIdentifier);

  const cron = await ctx.db
    .query("crons")
    .withIndex("name", (q) => q.eq("name", name))
    .unique();
  if (cron) {
    throw new Error(`Cron identifier registered twice: ${name}`);
  }

  const functionName = getFunctionName(functionReference);
  await ctx.db.insert("crons", {
    name,
    function: functionName,
    args: cronArgs,
  });
  ctx.scheduler.runAfter(0, internal.crons2.cronRunner, {
    name,
    function: functionName,
    args: cronArgs,
  });
}

/**
 * Schedule a mutation or action to run on an hourly basis.
 *
 * ```js
 * crons.interval("Clear presence data", {seconds: 30}, api.presence.clear);
 * ```
 *
 * @param identifier - A unique name for this scheduled job.
 * @param schedule - The time between runs for this scheduled job.
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 */
async function interval<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronIdentifier: string,
  schedule: Interval,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  const s = schedule;
  const hasSeconds = +("seconds" in s && s.seconds !== undefined);
  const hasMinutes = +("minutes" in s && s.minutes !== undefined);
  const hasHours = +("hours" in s && s.hours !== undefined);
  const total = hasSeconds + hasMinutes + hasHours;
  if (total !== 1) {
    throw new Error("Must specify one of seconds, minutes, or hours");
  }
  if (hasSeconds) {
    validateIntervalNumber(schedule.seconds!);
  } else if (hasMinutes) {
    validateIntervalNumber(schedule.minutes!);
  } else if (hasHours) {
    validateIntervalNumber(schedule.hours!);
  }
  await scheduleCron(
    ctx,
    cronIdentifier,
    { ...schedule, type: "interval" },
    functionReference,
    ...args
  );
}

/**
 * Schedule a mutation or action to run on a daily basis.
 *
 * ```js
 * crons.daily(
 *   "Reset high scores",
 *   {
 *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
 *     minuteUTC: 30,
 *   },
 *   api.scores.reset
 * )
 * ```
 *
 * @param cronIdentifier - A unique name for this scheduled job.
 * @param schedule - What time (UTC) each day to run this function.
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 */
export async function hourly<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronIdentifier: string,
  schedule: Hourly,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
  await scheduleCron(
    ctx,
    cronIdentifier,
    { minuteUTC, type: "hourly" },
    functionReference,
    ...args
  );
}

/**
 * Schedule a mutation or action to run on a daily basis.
 *
 * ```js
 * crons.daily(
 *   "Reset high scores",
 *   {
 *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
 *     minuteUTC: 30,
 *   },
 *   api.scores.reset
 * )
 * ```
 *
 * @param cronIdentifier - A unique name for this scheduled job.
 * @param schedule - What time (UTC) each day to run this function.
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 */
async function daily<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronIdentifier: string,
  schedule: Daily,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  const hourUTC = validatedHourOfDay(schedule.hourUTC);
  const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
  await scheduleCron(
    ctx,
    cronIdentifier,
    { hourUTC, minuteUTC, type: "daily" },
    functionReference,
    ...args
  );
}

/**
 * Schedule a mutation or action to run on a weekly basis.
 *
 * ```js
 * crons.weekly(
 *   "Weekly re-engagement email",
 *   {
 *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
 *     minuteUTC: 30,
 *   },
 *   api.emails.send
 * )
 * ```
 *
 * @param cronIdentifier - A unique name for this scheduled job.
 * @param schedule - What day and time (UTC) each week to run this function.
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 */
async function weekly<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronIdentifier: string,
  schedule: Weekly,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  const dayOfWeek = validatedDayOfWeek(schedule.dayOfWeek);
  const hourUTC = validatedHourOfDay(schedule.hourUTC);
  const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
  await scheduleCron(
    ctx,
    cronIdentifier,
    { dayOfWeek, hourUTC, minuteUTC, type: "weekly" },
    functionReference,
    ...args
  );
}

/**
 * Schedule a mutation or action to run on a monthly basis.
 *
 * Note that some months have fewer days than others, so e.g. a function
 * scheduled to run on the 30th will not run in February.
 *
 * ```js
 * crons.monthly(
 *   "Bill customers at ",
 *   {
 *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
 *     minuteUTC: 30,
 *     day: 1,
 *   },
 *   api.billing.billCustomers
 * )
 * ```
 *
 * @param cronIdentifier - A unique name for this scheduled job.
 * @param schedule - What day and time (UTC) each month to run this function.
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 */
async function monthly<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronIdentifier: string,
  schedule: Monthly,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  const day = validatedDayOfMonth(schedule.day);
  const hourUTC = validatedHourOfDay(schedule.hourUTC);
  const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
  await scheduleCron(
    ctx,
    cronIdentifier,
    { day, hourUTC, minuteUTC, type: "monthly" },
    functionReference,
    ...args
  );
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
 * @param cronIdentifier - A unique name for this scheduled job.
 * @param cron - Cron string like `"15 7 * * *"` (Every day at 7:15 UTC)
 * @param functionReference - A {@link FunctionReference} for the function
 * to schedule.
 * @param args - The arguments to the function.
 */
async function cron<FuncRef extends SchedulableFunctionReference>(
  ctx: MutationCtx,
  cronIdentifier: string,
  cron: CronString,
  functionReference: FuncRef,
  ...args: OptionalRestArgs<FuncRef>
) {
  const c = validatedCronString(cron);
  await scheduleCron(
    ctx,
    cronIdentifier,
    { cron: c, type: "cron" },
    functionReference,
    ...args
  );
}
