import { defineApp } from "convex/server";
import crons from "../src/crons/convex.config";

const app = defineApp();

app.install(crons, { args: {} });

export default app;
