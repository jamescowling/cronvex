import { httpRouter } from "convex/server";
import { log } from "./weblogs";

const http = httpRouter();

http.route({
  path: "/log",
  method: "POST",
  handler: log,
});

export default http;
