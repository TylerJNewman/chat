"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";
import {
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="bg-background box-border flex h-full flex-col overflow-hidden">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-8">
        <ThreadPrimitive.Empty>
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
            <p className="text-muted-foreground">
              Ask me anything to get started.
            </p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      <div className="border-t p-4">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-6 flex justify-end">
      <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2 max-w-xs">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-6 flex justify-start">
      <div className="bg-muted rounded-2xl px-4 py-2 max-w-xs">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};

const CopyButton: FC = () => {
  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
      <CopyIcon className="w-3 h-3" />
      <span className="sr-only">Copy</span>
    </Button>
  );
};

const RefreshButton: FC = () => {
  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
      <RefreshCwIcon className="w-3 h-3" />
      <span className="sr-only">Refresh</span>
    </Button>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex gap-2">
      <ComposerPrimitive.Input
        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Type your message..."
      />
      <ComposerPrimitive.Send asChild>
        <Button size="sm">
          <SendHorizontalIcon className="w-4 h-4" />
          <span className="sr-only">Send</span>
        </Button>
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}; 