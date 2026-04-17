"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="bg-[#111] border border-white/[0.06] p-10 rounded-3xl text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Something broke</h1>
        <p className="text-white/40 mb-4 text-sm">
          {error.message || "An unexpected error occurred"}
        </p>
        {error.digest && (
          <p className="text-white/20 text-xs mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-block bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-rose-400 hover:text-white transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
