"use client";

import {
  ActionBarPrimitive,
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
  ArrowUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThread } from "@/components/chat-runtime-provider";
import { useQueryState } from "nuqs";

export const Thread: FC = () => {
  const { isLoadingThread } = useThread();
  const [currentThreadId] = useQueryState('thread', {
    defaultValue: '',
    clearOnDefault: true,
  });

  return (
    <ThreadPrimitive.Root className="bg-background box-border flex h-full flex-col overflow-hidden">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-8 w-full max-w-screen-md mx-auto">
        {/* Show loading state if we have a thread ID but are loading messages */}
        {currentThreadId && isLoadingThread ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        ) : (
          <>
            {/* Only show empty state when there's no thread ID */}
            {!currentThreadId && (
              <ThreadPrimitive.Empty>
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
                  <p className="text-muted-foreground">
                    Ask me anything to get started.
                  </p>
                </div>
              </ThreadPrimitive.Empty>
            )}

            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                AssistantMessage,
              }}
            />
          </>
        )}
      </ThreadPrimitive.Viewport>

      <div className="px-4">
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
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        className="flex items-center gap-1 ml-2"
      >
        <ActionBarPrimitive.Copy asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MessagePrimitive.If copied>
              <CheckIcon className="w-3 h-3" />
            </MessagePrimitive.If>
            <MessagePrimitive.If copied={false}>
              <CopyIcon className="w-3 h-3" />
            </MessagePrimitive.If>
            <span className="sr-only">Copy</span>
          </Button>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <RefreshCwIcon className="w-3 h-3" />
            <span className="sr-only">Refresh</span>
          </Button>
        </ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
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
    <ComposerPrimitive.Root className="mx-auto w-full max-w-screen-md">
      <div className="relative flex flex-col rounded-t-xl border border-b-0 border-input bg-background px-3 pt-3 pb-2 min-h-[100px]">
        <div className="flex flex-col flex-1">
          <ComposerPrimitive.Input
            className="flex-1 bg-transparent text-base leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[48px] py-2 pr-12"
            placeholder="Type your message here..."
          />
        </div>
        <ComposerPrimitive.Send asChild>
          <Button 
            size="sm" 
            className="absolute bottom-2 right-2 h-9 w-9 rounded-lg p-2"
          >
            <ArrowUpIcon className="w-5 h-5" />
            <span className="sr-only">Send</span>
          </Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}; 