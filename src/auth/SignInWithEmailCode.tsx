import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Label } from "@/components/ui/label";

export function SignInWithEmailCode({
  handleCodeSent,
  provider,
  children,
}: {
  handleCodeSent: (email: string) => void;
  provider?: string;
  children?: React.ReactNode;
}) {
  const { signIn } = useAuthActions();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        const formData = new FormData(event.currentTarget);
        signIn(provider ?? "resend-otp", formData)
          .then(() => handleCodeSent(formData.get("email") as string))
          .catch((error) => {
            console.error(error);
            toast({
              title: "Could not send code",
              variant: "destructive",
            });
            setSubmitting(false);
          });
      }}
    >
      <Label htmlFor="email">Email</Label>
      <Input
        name="email"
        id="email"
        className="mt-2 mb-4"
        autoComplete="email"
      />
      {children}
      <Button type="submit" disabled={submitting}>
        Send access code
      </Button>
    </form>
  );
}
