"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-800">
      <Header />
      <Sidebar />
      <main className="pt-16 px-4 md:ml-56 transition-all duration-300">
        <div className="max-w-3xl mx-auto text-center">{children}</div>
      </main>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/30 via-white/0 to-transparent z-0" />
    </div>
  );
}
