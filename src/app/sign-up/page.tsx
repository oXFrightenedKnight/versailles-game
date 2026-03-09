import { RedirectToSignUp } from "@clerk/clerk-react";

export const signUp = () => {
  return (
    <RedirectToSignUp signUpForceRedirectUrl="/" signInForceRedirectUrl="/"></RedirectToSignUp>
  );
};

export default signUp;
