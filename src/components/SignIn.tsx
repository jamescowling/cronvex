"use client";

import { useAuthActions } from "@xixixao/convex-auth/react";

export function SignIn() {
  const { signIn } = useAuthActions();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void signIn("resend", formData);
      }}
    >
      <input name="email" placeholder="Email" type="text" />
      <button type="submit">Send sign-in link</button>
    </form>
  );
}
