# Cronvex

Userspace crons!

See `cronvex.ts` for the scheduling code. It just supports intervals in ms and
cronspecs (like `* * * * *`). We can add convenience wrappers for months and
days etc if needed.

See demo.ts or run the vite app for a simple echo service that runs forever.

Note that it's _possible_ that a cron will be lost is the system grinds to a
halt so much that the rescheduler function hits a user timeout. We can add a
cleanup job for this.
