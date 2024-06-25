import { expect, test } from "vitest";
import schema from "./schema";
import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
import * as cronlib from "./cronlib";

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

  // Make sure they show up in list, in any order.
  const allJobs = await t.run(async (ctx) => {
    return cronlib.list(ctx);
  });
  expect(allJobs.length).toBe(4);
  expect(allJobs).toContainEqual(cronJob);
  expect(allJobs).toContainEqual(otherJob);

  // Delete via name and id.
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

test("scheduling", async () => {
  // TODO test various types of cron schedules that run at the expected time
  expect(1).toBe(1);
});

test("independence", async () => {
  // TODO test if function raises rescheduler keeps going
  // TODO test if function keeps running forever the rescheduler doesn't double schedule
  expect(1).toBe(1);
});
