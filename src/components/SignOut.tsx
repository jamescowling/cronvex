"use client";

import { useAuthActions } from "@xixixao/convex-auth/react";

import { Button } from "./ui/button";

export function SignOut() {
  const { signOut } = useAuthActions();

  return (
    <Button variant="outline" className="gap-2" onClick={() => signOut()}>
      <div>Sign Out</div>
    </Button>
  );
}
