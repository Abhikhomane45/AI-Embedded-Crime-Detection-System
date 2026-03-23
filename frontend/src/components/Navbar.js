"use client";

import LogoutButton from "./LogoutButton";
import { AlignLeft } from "lucide-react";

export default function Navbar({ title }) {
  const handleMenuClick = () => {
    window.dispatchEvent(new CustomEvent("app:toggle-sidebar"));
  };

  return (
    <div className="flex h-16 items-center justify-between gap-4 px-6 bg-zinc-950/80 backdrop-blur-xl text-slate-100 border-b border-zinc-800/60 shadow-[0_4px_24px_rgba(0,0,0,0.4)] sticky top-0 z-40">
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={handleMenuClick}
          className="md:hidden rounded-lg p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-700"
          aria-label="Open sidebar"
        >
          <AlignLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex items-center gap-3">
          {typeof title === "string" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></div>
              <h1 className="text-lg font-medium text-slate-100 truncate tracking-wide">
                {title}
              </h1>
            </>
          ) : (
             title
          )}
        </div>
      </div>
      
      <div className="shrink-0 flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 mr-4 text-xs font-mono text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-md border border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          NETWORK_SECURE
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
