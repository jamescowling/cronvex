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

  // hourly should run once, minutely should run 60 times.
  vi.advanceTimersByTime(60 * 60 * 1000);
  await advanceSchedulerBy(vi, t, 200);
  expect((await t.query(internal.testUtils.TEST_get, {})).counter).toBe(61);

  // hourly should run once more, minutely should run another 60 times.
  vi.advanceTimersByTime(60 * 60 * 1000 - 200); // -200 to make up for advanceSchedulerBy
  await advanceSchedulerBy(vi, t, 200);
  expect((await t.query(internal.testUtils.TEST_get, {})).counter).toBe(122);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, hourly);
  });
  // minutely should run another 2 times.
  vi.advanceTimersByTime(123456);
  await advanceSchedulerBy(vi, t, 200);
  expect((await t.query(internal.testUtils.TEST_get, {})).counter).toBe(124);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, minutely);
  });
  // No more jobs to run.
  await advanceSchedulerBy(vi, t, 200);
  expect((await t.query(internal.testUtils.TEST_get, {})).counter).toBe(124);
  vi.useRealTimers();
});

// Test that scheduling doesn't fail if a job fails.
test("failures", async () => {
  vi.useFakeTimers();
  const t = convexTest(testSchema);
  await t.mutation(internal.testUtils.TEST_reset, {});

  const goodie = await t.run(async (ctx) => {
    // Increments every second.
    return cronlib.interval(ctx, 1000, internal.testUtils.TEST_increment, {});
  });
  vi.advanceTimersByTime(1); // goodie should always run just before flaky
  const flaky = await t.run(async (ctx) => {
    // Fails if counter is even.
    return cronlib.interval(ctx, 1000, internal.testUtils.TEST_flake, {});
  });

  // Each cron should fire three times with goodie running before flaky. The
  // good counter will increment each time but the flakyCounter will throw the
  // second time around.
  vi.advanceTimersByTime(3000);
  await advanceSchedulerBy(vi, t, 200);
  const testData = await t.query(internal.testUtils.TEST_get, {});
  expect(testData.counter).toBe(3);
  expect(testData.flakyCounter).toBe(2);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, goodie);
    await cronlib.del(ctx, flaky);
  });
  vi.useRealTimers();
});

// Test that we don't double-schedule jobs that are still running at their next
// scheduled time.
test("slowpokes", async () => {
  vi.useFakeTimers();
  const t = convexTest(testSchema);
  await t.mutation(internal.testUtils.TEST_reset, {});

  // XXX I don't know if this will ever work in test since I'm doing a
  // setTimeout(resolve, 1100) in TEST_slow which I don't know if is compatible
  // with the mock timer.
  const slowpoke = await t.run(async (ctx) => {
    // Takes 1.1 seconds to run.
    return cronlib.interval(ctx, 1000, internal.testUtils.TEST_slow, {});
  });

  // The cron should fire three times but the second time shouldn't execute
  // because the job is still running.
  vi.advanceTimersByTime(3500);
  await advanceSchedulerBy(vi, t, 200);
  expect((await t.query(internal.testUtils.TEST_get, {})).slowCounter).toBe(2);

  await t.run(async (ctx) => {
    await cronlib.del(ctx, slowpoke);
  });
  vi.useRealTimers();
});
