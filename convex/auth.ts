import { convexAuth } from "@xixixao/convex-auth/server";
import Resend from "@auth/core/providers/resend";

export const { auth, signIn, verifyCode, signOut, store } = convexAuth({
  providers: [Resend],
});
