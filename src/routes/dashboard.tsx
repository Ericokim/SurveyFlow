import { createFileRoute } from "@tanstack/react-router";

import Navbar from "@/components/shared/Navbar";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-7 py-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-bold text-4xl text-foreground tracking-normal">
              Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Monitor activity, response trends, and recent surveys.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
