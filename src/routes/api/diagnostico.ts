import { createFileRoute } from "@tanstack/react-router";
import { handleDiagnostico } from "@/lib/orca.server";

export const Route = createFileRoute("/api/diagnostico")({
  server: { handlers: { POST: ({ request }) => handleDiagnostico(request) } },
});
