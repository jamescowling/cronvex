// XXX these tests are all broken now that we're on the components alpha

import { expect, test, vi, VitestUtils } from "vitest";
import schema from "./schema";
import { convexTest, TestConvex } from "convex-test";
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

// convex-test is mostly intended for unit testing, not for testing concurrent
// runs of recursively scheduled functions. In our tests it isn't sufficient
// just to wait for in-progress scheduled functions to finish, since these
// functions schedule their own functions that we have to wait to finish,
// repeating until there are no more scheduled functions to run at the current
// time. What we should really do is test Cronvex against a local backend but
// for now we can hack around this problem by advancing the time and scheduler
// manually.
async function advanceSchedulerBy(
  vi: VitestUtils,
  t: TestConvex<any>,
  n: number
) {
  for (let i = 0; i < n; i++) {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  }
}

// Test scheduling actually works.
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
  const minutely = await t.run(async (ctx) => {
    return cronlib.interval(ctx, 60000, internal.testUtils.TEST_increment, {});
  });
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(0);

  // hourly should run once, minutely should run 60 times.
  vi.advanceTimersByTime(60 * 60 * 1000);
  await advanceSchedulerBy(vi, t, 200);
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(61);

  // hourly should run once more, minutely should run another 60 times.
  vi.advanceTimersByTime(60 * 60 * 1000 - 200); // -200 to make up for advanceSchedulerBy
  await advanceSchedulerBy(vi, t, 200);
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(122);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, hourly);
  });
  // minutely should run another 2 times.
  vi.advanceTimersByTime(123456);
  await advanceSchedulerBy(vi, t, 200);
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(124);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, minutely);
  });
  // No more jobs to run.
  await advanceSchedulerBy(vi, t, 200);
  expect(await t.query(internal.testUtils.TEST_get, {})).toBe(124);
  vi.useRealTimers();
});
