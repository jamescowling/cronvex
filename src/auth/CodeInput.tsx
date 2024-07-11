import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function CodeInput({ length = 6 }: { length?: number }) {
  const halfLength = Math.floor(length / 2);

  return (
    <div className="mb-4">
      <InputOTP maxLength={6} name="code" id="code">
        <InputOTPGroup>
          {Array(halfLength)
            .fill(null)
            .map((_, index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          {Array(length - halfLength)
            .fill(null)
            .map((_, index) => (
              <InputOTPSlot
                key={halfLength + index}
                index={halfLength + index}
              />
            ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
