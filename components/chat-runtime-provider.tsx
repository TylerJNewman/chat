"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { type ReactNode, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChat } from "ai/react";

export const ChatRuntimeProvider = ({ children }: { children: ReactNode }) => {
  const [threadId, setThreadId] = useState(uuidv4());

  const chat = useChat({
    api: "/api/chat",
    body: {
      threadId,
    },
  });

  const runtime = useVercelUseChatRuntime(chat);

  const handleNewThread = () => {
    setThreadId(uuidv4());
    chat.reload();
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* We can add a button to call handleNewThread later */}
      {children}
    </AssistantRuntimeProvider>
  );
}; 