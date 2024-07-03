import { expect, test, vi } from "vitest";
import schema from "./schema";
import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
import * as cronlib from "./cronlib";
import { testSchema } from "./testUtils";

// Test we can register, fetch, delete, etc correctly.
test("management", async () => {
  const t = convexTest(schema);

  // Register named/unnamed crons/intervals
  const namedCronJobId = await t.run(async (ctx) => {
    return cronlib.cronWithName(
      ctx,
      "cronJob",
      "* * * * *",
      internal.init.exampleCron,
      {
        message: "just testing",
      }
    );
  });
  const unnamedCronJobId = await t.run(async (ctx) => {
    return cronlib.cron(ctx, "* * * * *", internal.init.exampleCron, {
      message: "just testing",
    });
  });
  const namedIntervalJobId = await t.run(async (ctx) => {
    return cronlib.intervalWithName(
      ctx,
      "intervalJob",
      1000,
      internal.init.exampleCron,
      {
        message: "just testing",
      }
    );
  });
  const unnamedIntervalJobId = await t.run(async (ctx) => {
    return cronlib.interval(ctx, 1000, internal.init.exampleCron, {
      message: "just testing",
    });
  });

  // Fetch via name/id.
  const cronJob = await t.run(async (ctx) => {
    return cronlib.getByName(ctx, "cronJob");
  });
  expect(cronJob).not.to.be.null;
  expect(cronJob?._id).toBe(namedCronJobId);
  const sameJob = await t.run(async (ctx) => {
    return cronlib.get(ctx, namedCronJobId);
  });
  expect(sameJob).toStrictEqual(cronJob);
  const otherJob = await t.run(async (ctx) => {
    return cronlib.get(ctx, unnamedIntervalJobId);
  });
  expect(otherJob).not.to.be.null;
  expect(otherJob?._id).toBe(unnamedIntervalJobId);
  const nonJob = await t.run(async (ctx) => {
    return cronlib.getByName(ctx, "nonJob");
  });
  expect(nonJob).to.be.null;

  // Duplicate registration
  await t.run(async (ctx) => {
    await expect(
      cronlib.intervalWithName(
        ctx,
        "intervalJob",
        1000,
        internal.init.exampleCron,
        {
          message: "just testing... again",
        }
      )
    ).rejects.toThrow('Cron job with name "intervalJob" already exists');
  });

  // Invalid job spec/interval.
  await t.run(async (ctx) => {
    await expect(
      cronlib.cron(ctx, "just do it every day ok?", internal.init.exampleCron, {
        message: "just testing",
      })
    ).rejects.toThrow('Invalid cronspec: "just do it every day ok?"');
  });
  await t.run(async (ctx) => {
    await expect(
      cronlib.interval(ctx, 0, internal.init.exampleCron, {
        message: "just testing",
      })
    ).rejects.toThrow("Interval must be >= 1000ms");
  });

  // List and delete.
  const allJobs = await t.run(async (ctx) => {
    return cronlib.list(ctx);
  });
  expect(allJobs.length).toBe(4);
  expect(allJobs).toContainEqual(cronJob);
  expect(allJobs).toContainEqual(otherJob);
  await t.run(async (ctx) => {
    await cronlib.delByName(ctx, "cronJob");
    await cronlib.del(ctx, unnamedCronJobId);
    await cronlib.del(ctx, namedIntervalJobId); // intentionally by id
    await cronlib.del(ctx, unnamedIntervalJobId);
  });
  const noJobs = await t.run(async (ctx) => {
    return cronlib.list(ctx);
  });
  expect(noJobs.length).toBe(0);
});

// Test scheduling actually works.
// XXX this test currently fails
test("scheduling", async () => {
  vi.useFakeTimers();
  const t = convexTest(testSchema);
  await t.mutation(internal.testUtils.TEST_reset, {});

  const hourly = await t.run(async (ctx) => {
    return cronlib.cron(
      ctx,
      "0 * * * *",
      internal.testUtils.TEST_increment,
      {}
    );
  });
  const semiMinutely = await t.run(async (ctx) => {
    return cronlib.interval(ctx, 30000, internal.testUtils.TEST_increment, {});
  });
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(0);

  // XXX what happens if we don't call finishInProgressScheduledFunctions()?
  // does this mean that the rescheduler is ready to run but hasn't yet?
  // so even if it gets canceled by delete it will still run?
  vi.advanceTimersByTime(60 * 60 * 1000);
  await t.finishInProgressScheduledFunctions();
  // XXX this is required to get the execution job to run even though it seems
  // like it shouldn't need time advanced, since it's ctx.scheduler.runAfter(0, cronFunction, cronJob.args);
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
  // hourly should have run once, semiMinutely should have run 120 times.
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(121);

  vi.advanceTimersByTime(60 * 60 * 1000);
  await t.finishInProgressScheduledFunctions();
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
  // hourly should have run once more, semiMinutely should have run another 120 times.
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(242);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, hourly);
  });
  vi.advanceTimersByTime(123456);
  await t.finishInProgressScheduledFunctions();
  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
  // semiMinutely should have run another 4 times.
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(246);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, semiMinutely);
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(246);
  vi.useRealTimers();
});

// test("independence", async () => {
//   // TODO test if function raises rescheduler keeps going
//   // TODO test if function keeps running forever the rescheduler doesn't double schedule
//   expect(1).toBe(1);
// });
