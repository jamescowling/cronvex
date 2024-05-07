// // These are extra wrappers for convenience but they can just map to cron()

// const DAYS_OF_WEEK = [
//   "sunday",
//   "monday",
//   "tuesday",
//   "wednesday",
//   "thursday",
//   "friday",
//   "saturday",
// ];
// type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// // Duplicating types so docstrings are visible in signatures:
// // `Expand<Omit<MonthlySchedule, "type">>` doesn't preserve docstrings.
// // When we get to TypeScript 4.9, `satisfies` would go nicely here.

// /** @public */
// export type Interval =
//   | {
//       /**
//        * Run a job every `seconds` seconds, beginning
//        * when the job is first deployed to Convex.
//        */
//       seconds: number;
//       minutes?: undefined;
//       hours?: undefined;
//     }
//   | {
//       /**
//        * Run a job every `minutes` minutes, beginning
//        * when the job is first deployed to Convex.
//        */
//       minutes: number;
//       seconds?: undefined;
//       hours?: undefined;
//     }
//   | {
//       /**
//        * Run a job every `hours` hours, beginning when
//        * when the job is first deployed to Convex.
//        */
//       hours: number;
//       seconds?: undefined;
//       minutes?: undefined;
//     };

// /** @public */
// export type Hourly = {
//   /**
//    * Minutes past the hour, 0-59.
//    */
//   minuteUTC: number;
// };

// /** @public */
// export type Daily = {
//   /**
//    * 0-23, hour of day. Remember, this is UTC.
//    */
//   hourUTC: number;
//   /**
//    * 0-59, minute of hour. Remember, this is UTC.
//    */
//   minuteUTC: number;
// };

// /** @public */
// type Monthly = {
//   /**
//    * 1-31, day of month. Days greater that 28 will not run every month.
//    */
//   day: number;
//   /**
//    * 0-23, hour of day. Remember to convert from your own time zone to UTC.
//    */
//   hourUTC: number;
//   /**
//    * 0-59, minute of hour. Remember to convert from your own time zone to UTC.
//    */
//   minuteUTC: number;
// };
// /** @public */
// export type Weekly = {
//   /**
//    * "monday", "tuesday", etc.
//    */
//   dayOfWeek: DayOfWeek;
//   /**
//    * 0-23, hour of day. Remember to convert from your own time zone to UTC.
//    */
//   hourUTC: number;
//   /**
//    * 0-59, minute of hour. Remember to convert from your own time zone to UTC.
//    */
//   minuteUTC: number;
// };

// function validatedDayOfMonth(n: number) {
//   if (!Number.isInteger(n) || n < 1 || n > 31) {
//     throw new Error("Day of month must be an integer from 1 to 31");
//   }
//   return n;
// }

// function validatedDayOfWeek(s: string) {
//   if (typeof s !== "string" || !DAYS_OF_WEEK.includes(s)) {
//     throw new Error('Day of week must be a string like "monday".');
//   }
//   return s;
// }

// function validatedHourOfDay(n: number) {
//   if (!Number.isInteger(n) || n < 0 || n > 23) {
//     throw new Error("Hour of day must be an integer from 0 to 23");
//   }
//   return n;
// }

// function validatedMinuteOfHour(n: number) {
//   if (!Number.isInteger(n) || n < 0 || n > 59) {
//     throw new Error("Minute of hour must be an integer from 0 to 59");
//   }
//   return n;
// }

// /**
//  * Schedule a mutation or action to run on a daily basis.
//  *
//  * ```js
//  * crons.daily(
//  *   "Reset high scores",
//  *   {
//  *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
//  *     minuteUTC: 30,
//  *   },
//  *   api.scores.reset
//  * )
//  * ```
//  *
//  * @param cronIdentifier - A unique name for this scheduled job.
//  * @param schedule - What time (UTC) each day to run this function.
//  * @param functionReference - A {@link FunctionReference} for the function
//  * to schedule.
//  * @param args - The arguments to the function.
//  */
// export async function hourly<FuncRef extends SchedulableFunctionReference>(
//   ctx: MutationCtx,
//   cronIdentifier: string,
//   schedule: Hourly,
//   functionReference: FuncRef,
//   ...args: OptionalRestArgs<FuncRef>
// ) {
//   const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
//   throw new Error("Not implemented. Just wrap cron");
// }

// /**
//  * Schedule a mutation or action to run on a daily basis.
//  *
//  * ```js
//  * crons.daily(
//  *   "Reset high scores",
//  *   {
//  *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
//  *     minuteUTC: 30,
//  *   },
//  *   api.scores.reset
//  * )
//  * ```
//  *
//  * @param cronIdentifier - A unique name for this scheduled job.
//  * @param schedule - What time (UTC) each day to run this function.
//  * @param functionReference - A {@link FunctionReference} for the function
//  * to schedule.
//  * @param args - The arguments to the function.
//  */
// async function daily<FuncRef extends SchedulableFunctionReference>(
//   ctx: MutationCtx,
//   cronIdentifier: string,
//   schedule: Daily,
//   functionReference: FuncRef,
//   ...args: OptionalRestArgs<FuncRef>
// ) {
//   const hourUTC = validatedHourOfDay(schedule.hourUTC);
//   const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
//   throw new Error("Not implemented. Just wrap cron");
// }

// /**
//  * Schedule a mutation or action to run on a weekly basis.
//  *
//  * ```js
//  * crons.weekly(
//  *   "Weekly re-engagement email",
//  *   {
//  *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
//  *     minuteUTC: 30,
//  *   },
//  *   api.emails.send
//  * )
//  * ```
//  *
//  * @param cronIdentifier - A unique name for this scheduled job.
//  * @param schedule - What day and time (UTC) each week to run this function.
//  * @param functionReference - A {@link FunctionReference} for the function
//  * to schedule.
//  */
// async function weekly<FuncRef extends SchedulableFunctionReference>(
//   ctx: MutationCtx,
//   cronIdentifier: string,
//   schedule: Weekly,
//   functionReference: FuncRef,
//   ...args: OptionalRestArgs<FuncRef>
// ) {
//   const dayOfWeek = validatedDayOfWeek(schedule.dayOfWeek);
//   const hourUTC = validatedHourOfDay(schedule.hourUTC);
//   const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
//   throw new Error("Not implemented. Just wrap cron");
// }

// /**
//  * Schedule a mutation or action to run on a monthly basis.
//  *
//  * Note that some months have fewer days than others, so e.g. a function
//  * scheduled to run on the 30th will not run in February.
//  *
//  * ```js
//  * crons.monthly(
//  *   "Bill customers at ",
//  *   {
//  *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
//  *     minuteUTC: 30,
//  *     day: 1,
//  *   },
//  *   api.billing.billCustomers
//  * )
//  * ```
//  *
//  * @param cronIdentifier - A unique name for this scheduled job.
//  * @param schedule - What day and time (UTC) each month to run this function.
//  * @param functionReference - A {@link FunctionReference} for the function
//  * to schedule.
//  * @param args - The arguments to the function.
//  */
// async function monthly<FuncRef extends SchedulableFunctionReference>(
//   ctx: MutationCtx,
//   cronIdentifier: string,
//   schedule: Monthly,
//   functionReference: FuncRef,
//   ...args: OptionalRestArgs<FuncRef>
// ) {
//   const day = validatedDayOfMonth(schedule.day);
//   const hourUTC = validatedHourOfDay(schedule.hourUTC);
//   const minuteUTC = validatedMinuteOfHour(schedule.minuteUTC);
//   throw new Error("Not implemented. Just wrap cron");
// }
