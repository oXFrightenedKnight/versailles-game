"use client";

import { ClerkProvider } from "@clerk/clerk-react";

const ClerkClientProvider = ({
  publishableKey,
  children,
}: {
  publishableKey: string;
  children: React.ReactNode;
}) => {
  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
};

export default ClerkClientProvider;
