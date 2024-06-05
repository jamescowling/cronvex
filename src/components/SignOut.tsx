"use client";

import { useAuthActions } from "@xixixao/convex-auth/react";

export function SignOut() {
  const { signOut } = useAuthActions();
  return <button onClick={() => signOut()}>Sign out</button>;
}
