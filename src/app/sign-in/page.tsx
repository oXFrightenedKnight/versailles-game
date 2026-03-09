"use client";

import { RedirectToSignIn } from "@clerk/clerk-react";

export const signIn = () => {
  return (
    <RedirectToSignIn signInForceRedirectUrl="/" signUpForceRedirectUrl="/"></RedirectToSignIn>
  );
};

export default signIn;
