import { CodeInput } from "@/auth/CodeInput";
import { SignInMethodDivider } from "@/auth/SignInMethodDivider";
import { SignInWithEmailCode } from "@/auth/SignInWithEmailCode";
import { SignInWithOAuth } from "@/auth/SignInWithOAuth";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function SignInFormEmailCode() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  return (
    <DialogContent>
      {step === "signIn" ? (
        <>
          <DialogHeader>
            <DialogTitle className="text-2xl">Sign in</DialogTitle>
            <DialogDescription>
              Use auth provider or enter email for access code to sign in
              immediately.
            </DialogDescription>
          </DialogHeader>
          <SignInWithOAuth />
          <SignInMethodDivider />
          <SignInWithEmailCode handleCodeSent={(email) => setStep({ email })} />
        </>
      ) : (
        <>
          <DialogHeader>
            <DialogTitle className="text-2xl">Enter code</DialogTitle>
            <DialogDescription>
              Enter the one-time code sent to your email.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitting(true);
              const formData = new FormData(event.currentTarget);
              signIn("resend-otp", formData).catch(() => {
                toast({
                  title: "Code could not be verified, try again",
                  variant: "destructive",
                });
                setSubmitting(false);
              });
            }}
          >
            <Label htmlFor="code" className="mb-2">
              Code
            </Label>
            <CodeInput />
            <div className="flex flex-row gap-2">
              <input name="email" value={step.email} type="hidden" />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep("signIn")}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full" disabled={submitting}>
                Continue
              </Button>
            </div>
          </form>
        </>
      )}
      <Toaster />
    </DialogContent>
  );
}
