import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated } from "convex/react";

import { Button } from "@/components/ui/button";
import { SignInFormEmailCode } from "../auth/SignInFormEmailCode";
import { Dialog, DialogTrigger } from "./ui/dialog";

export function Profile() {
  return (
    <div>
      <Authenticated>
        <SignOut />
      </Authenticated>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
    </div>
  );
}

export function SignIn() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          Sign in
        </Button>
      </DialogTrigger>
      <SignInFormEmailCode />
    </Dialog>
  );
}

function SignOut() {
  const { signOut } = useAuthActions();

  return (
    <Button
      variant="outline"
      className="gap-2  bg-primary-foreground"
      onClick={() => void signOut()}
    >
      <div>Sign Out</div>
    </Button>
  );
}
