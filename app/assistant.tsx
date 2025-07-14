"use client";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { FC, PropsWithChildren } from "react";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

const Assistant: FC<PropsWithChildren> = ({ children }) => {
  const [threadId] = useState(uuidv4());
  const [resourceId] = useState("user-123"); // Hardcode for persistence

  const runtime = useChatRuntime({
    api: "/api/chat",
    body: {
      threadId,
      resourceId,
    },
    maxSteps: 5,
    // adapters: {
    //   attachments: new CompositeAttachmentAdapter([
    //     new SimpleImageAttachmentAdapter(),
    //     new SimpleTextAttachmentAdapter(),
    //   ]),
    //   speech: new WebSpeechSynthesisAdapter(),
    // },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">{children}</div>
    </AssistantRuntimeProvider>
  );
};

export default Assistant;
