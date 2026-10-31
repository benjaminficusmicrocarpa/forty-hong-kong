import { createFileRoute } from "@tanstack/react-router";
import { FortyApp } from "@/components/forty-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FortyApp />;
}
