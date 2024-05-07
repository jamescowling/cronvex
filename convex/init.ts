// // TODO: get rid of crons.ts and replace with wrappers in here

// // TODO: also needs to be able to be registered programmatically at runtime

// import { Interval } from "convex/dist/cjs-types/server/cron";
// import { DatabaseWriter, internalMutation } from "./_generated/server";
// import { OptionalRestArgs, SchedulableFunctionReference } from "convex/server";

// // import { cronJobs } from "convex/server";
// // import { internal } from "./_generated/api";

// // const crons = cronJobs();

// // TODO ability to clear all crons
// // TODO ability to list all crons
// // TODO only one execution of a cron at a time. have to check if already running

// async function interval(
//   db: DatabaseWriter,
//   name: string,
//   schedule: Interval,
//   func: string
// ) {
//   console.log("interval", name, schedule, func);

//   const cron = await db
//     .query("crons")
//     .withIndex("name", (q) => q.eq("name", name))
//     .unique();
//   if (cron) {
//     console.log(`Cron ${name} already exists`);
//     // TODO probably i want to check if it's actually scheduled
//     return;
//   }
// }

// // function interval<FuncRef extends SchedulableFunctionReference>(
// //   cronIdentifier: string,
// //   schedule: Interval,
// //   functionReference: FuncRef,
// //   ...args: OptionalRestArgs<FuncRef>
// // ) {
// //   const s = schedule;
// //   const hasSeconds = +("seconds" in s && s.seconds !== undefined);
// //   const hasMinutes = +("minutes" in s && s.minutes !== undefined);
// //   const hasHours = +("hours" in s && s.hours !== undefined);
// //   const total = hasSeconds + hasMinutes + hasHours;
// //   if (total !== 1) {
// //     throw new Error("Must specify one of seconds, minutes, or hours");
// //   }
// //   if (hasSeconds) {
// //     validateIntervalNumber(schedule.seconds!);
// //   } else if (hasMinutes) {
// //     validateIntervalNumber(schedule.minutes!);
// //   } else if (hasHours) {
// //     validateIntervalNumber(schedule.hours!);
// //   }
// //   this.schedule(
// //     cronIdentifier,
// //     { ...schedule, type: "interval" },
// //     functionReference,
// //     ...args
// //   );
// // }

// export const registerCrons = internalMutation({
//   handler: async (ctx) => {
//     console.log("Registering crons");

//     // crons.interval(
//     //   "clear messages table",
//     //   { minutes: 1 }, // every minute
//     //   internal.messages.clearAll,
//     // );
//     interval(
//       ctx.db,
//       "clear messages table",
//       { minutes: 1 },
//       "internal.messages.clearAll"
//     );

//     console.log("register this cron");

//     // crons.interval(
//     //   "clear messages table",
//     //   { minutes: 1 }, // every minute
//     //   internal.messages.clearAll,
//     // );

//     console.log("register this cron");

//     // crons.monthly(
//     //   "payment reminder",
//     //   { day: 1, hourUTC: 16, minuteUTC: 0 }, // Every month on the first day at 8:00am PST
//     //   internal.payments.sendPaymentEmail,
//     //   { email: "my_email@gmail.com" }, // argument to sendPaymentEmail
//     // );

//     console.log("register this cron");

//     // // An alternative way to create the same schedule as above with cron syntax
//     // crons.cron(
//     //   "payment reminder duplicate",
//     //   "0 16 1 * *",
//     //   internal.payments.sendPaymentEmail,
//     //   { email: "my_email@gmail.com" }, // argument to sendPaymentEmail
//     // );

//     console.log("register this cron");
//   },
// });

// // export default crons;
