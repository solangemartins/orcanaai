import { createFileRoute } from "@tanstack/react-router";
import { handleChat } from "@/lib/orca.server";

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handleChat(request) } },
});
