import { Suspense } from "react";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import CheckoutSuccessClient from "./checkout-success-client";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb]">
          <RivalLoadingBlock />
        </main>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
