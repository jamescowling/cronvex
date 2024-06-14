# Cronvex

An implementation of a http webhook-calling cron service running on Convex. This
was built as a demo app for userspace crons that are implemented in
`cronlib.ts`. We'll eventually port these directly into Convex but in the
meantime you can copy this file if you want to add userspace crons to your own
Convex project.

A userspace cron, as opposed to the built-in crons defined in `crons.ts` in a
Convex project, allow declaration of crons at runtime. The built-in cronx in
Convex must be defined statically in the `crons.ts` file.

Note that it's _possible_ that a cron will be lost is the system grinds to a
halt so much that the rescheduler function hits a user timeout. We can add a
cleanup job for this.

TODO: test pagination works

TODO: visual refresh

TODO: add tests
