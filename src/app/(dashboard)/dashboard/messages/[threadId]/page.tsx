import type { Metadata } from "next";
import MessageThreadView from "@/components/vendor/MessageThreadView";

export const metadata: Metadata = {
  title: "Conversation — Foundry",
};

export default async function MessageThreadRoute({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <MessageThreadView threadId={threadId} />;
}
