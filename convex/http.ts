import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { log } from "./weblogs";

const http = httpRouter();

http.route({
  path: "/log",
  method: "POST",
  handler: log,
});

auth.addHttpRoutes(http);

export default http;
