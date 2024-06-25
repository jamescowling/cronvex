import { convexAuth } from "@xixixao/convex-auth/server";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [ResendOTP],
});
