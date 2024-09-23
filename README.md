# Cronvex

Send http requests on a periodic schedule.

This is an implementation of a http webhook-calling cron service running on
[Convex](https://convex.dev). Cronvex was originally built as a demo of
userspace crons before these were turned into a standalone Convex component.

A user space cron, as opposed to the built-in crons that come by default with
Convex, allow declaration of crons at runtime. The built-in crons in Convex can
only be defined statically, in a file called `crons.ts`.

If you're looking at this project you might be interested in the [Convex crons
component](https://www.npmjs.com/package/@convex-dev/crons).

This project is described in more detail in the blog post [Cron Jobs in User
Space](https://stack.convex.dev/cron-jobs).

![cronvex.com screenshot](https://cronvex.com/thumbnail.png)

See [http://cronvex.com](http://cronvex.com) for a free hosted version of this service.
