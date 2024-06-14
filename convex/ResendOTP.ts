import Resend from "@auth/core/providers/resend";
import { ConvexError } from "convex/values";
import { Resend as ResendAPI } from "resend";
import { VerificationCodeEmail } from "./VerificationCodeEmail";
import { alphabet, generateRandomString } from "oslo/crypto";
import { renderToStaticMarkup } from "react-dom/server";

export const ResendOTP = Resend({
  id: "resend-otp",
  async generateVerificationToken() {
    return generateRandomString(6, alphabet("0-9"));
  },
  async sendVerificationRequest({
    identifier: email,
    provider,
    token,
    expires,
  }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Cronvex <onboarding@resend.dev>",
      to: [email],
      subject: `Sign in to Cronvex`,
      // Couldn't easily figure out why
      //   react: VerificationCodeEmail({ code: token, expires }),
      // was giving a
      //   reactDOMServer.renderToPipeableStream is not a function
      // error so just manually rendering.
      html: renderToStaticMarkup(
        VerificationCodeEmail({ code: token, expires })
      ),
    });

    if (error) {
      throw new ConvexError("Could not send verification code email");
    }
  },
});
