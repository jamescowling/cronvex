import { defineApp } from "convex/server";
import crons from "@convex-dev/crons/convex.config";

const app = defineApp();
app.use(crons, { name: "crons" });

export default app;
