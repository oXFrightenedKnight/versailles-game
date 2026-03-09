"use client";
import { PropsWithChildren, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/app/_trpc/client";
import { useAuth } from "@clerk/clerk-react";

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL!;
};

const Providers = ({ children }: PropsWithChildren) => {
  const { getToken } = useAuth();

  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          fetch(url, opts) {
            return fetch(url, {
              ...opts,
              credentials: "include",
            });
          },
          headers: async () => {
            const token = await getToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};

export default Providers;
