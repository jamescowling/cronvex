/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib from "../lib.js";
import type * as parseArgs from "../parseArgs.js";
import type * as testUtils from "../testUtils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  lib: typeof lib;
  parseArgs: typeof parseArgs;
  testUtils: typeof testUtils;
}>;
declare const fullApiWithMounts: typeof fullApi & {
  lib: {
    del: FunctionReference<"mutation", "public", { id: string }, any>;
    delByName: FunctionReference<"mutation", "public", { name: string }, any>;
    get: FunctionReference<"query", "public", { id: string }, any>;
    getByName: FunctionReference<"query", "public", { name: string }, any>;
    list: FunctionReference<"query", "public", any, any>;
    registerCron: FunctionReference<
      "mutation",
      "public",
      { args: any; cronspec: string; functionHandle: string; name?: string },
      any
    >;
    registerInterval: FunctionReference<
      "mutation",
      "public",
      { args: any; functionHandle: string; ms: number; name?: string },
      any
    >;
  };
};

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;
