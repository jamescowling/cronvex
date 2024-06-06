"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { useAuthActions } from "@xixixao/convex-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogHeader,
  DialogFooter,
} from "./ui/dialog";

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
  const { signIn } = useAuthActions();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">Sign in</DialogTitle>
          <DialogDescription>
            Enter your email for an access code to sign in immediately.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void signIn("resend", formData);
            event.currentTarget.reset();
          }}
        >
          <div className="grid gap-2 py-4">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">
              Send sign-in link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SignOut() {
  const { signOut } = useAuthActions();

  return (
    <Button variant="outline" className="gap-2" onClick={() => signOut()}>
      <div>Sign Out</div>
    </Button>
  );
}
