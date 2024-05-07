import { Value } from "convex/values";

// TODO export these from Convex if they're not already

/**
 * Validate that the arguments to a Convex function are an object, defaulting
 * `undefined` to `{}`.
 */
export function parseArgs(
  args: Record<string, Value> | undefined
): Record<string, Value> {
  if (args === undefined) {
    return {};
  }
  if (!isSimpleObject(args)) {
    throw new Error(
      `The arguments to a Convex function must be an object. Received: ${
        args as any
      }`
    );
  }
  return args;
}

/**
 * Check whether a value is a plain old JavaScript object.
 */
export function isSimpleObject(value: unknown) {
  const isObject = typeof value === "object";
  const prototype = Object.getPrototypeOf(value);
  const isSimple =
    prototype === null ||
    prototype === Object.prototype ||
    // Objects generated from other contexts (e.g. across Node.js `vm` modules) will not satisfy the previous
    // conditions but are still simple objects.
    prototype?.constructor?.name === "Object";
  return isObject && isSimple;
}
