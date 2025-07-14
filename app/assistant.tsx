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

const Assistant: FC<PropsWithChildren> = ({ children }) => {
  const runtime = useChatRuntime({
    api: "/api/chat",
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
