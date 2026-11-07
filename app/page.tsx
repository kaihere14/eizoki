import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-100 selection:text-zinc-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        {/* Visual discovery feed will live here */}
      </main>
    </div>
  );
}
