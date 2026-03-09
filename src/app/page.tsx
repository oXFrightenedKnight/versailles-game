"use client";

import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { redirect } from "next/navigation";

export default function Home() {
  return (
    <div className="w-full h-screen flex justify-center items-center border">
      <div className="flex flex-col items-center justify-center p-20 gap-10 border-red-500 border">
        <p className="text-9xl">Versailles</p>
        <SignedOut>
          <div className="w-full h-full flex justify-center items-center gap-5">
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/sign-in")}
            >
              Sign In
            </Button>
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/sign-up")}
            >
              Sign Up
            </Button>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="w-full h-full flex justify-center items-center gap-5">
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/")}
            >
              Continue
            </Button>
            <Button
              className="text-white bg-amber-600 border-amber-800 border-2 rounded-[12px] cursor-pointer hover:bg-amber-700 text-3xl p-8"
              onClick={() => redirect("/game")}
            >
              New Game
            </Button>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
