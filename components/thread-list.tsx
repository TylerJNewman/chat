"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, X } from "lucide-react";
import { useThread } from "./chat-runtime-provider";
import { useEffect, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";

export const ThreadList = () => {
  const { newThread, currentThreadId } = useThread();
  const {
    threads,
    setThreads,
    removeThread,
    setCurrentThreadId,
    isLoadingThreads,
    setIsLoadingThreads,
  } = useChatStore();

  // Load threads from API
  const loadThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const response = await fetch("/api/threads", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      } else {
        console.error("Failed to load threads:", response.status);
      }
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [setThreads, setIsLoadingThreads]);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Delete thread
  const deleteThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        removeThread(threadId);
        // If we deleted the current thread, create a new one
        if (threadId === currentThreadId) {
          newThread();
        }
      } else {
        console.error("Failed to delete thread:", response.status);
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  };

  // Switch to thread
  const switchToThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    // The ChatRuntimeProvider will automatically load messages for this thread
  };

  return (
    <nav className="bg-muted/40 border-r min-h-full overflow-hidden w-64 flex flex-col">
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">Conversations</h2>
        
        {/* New Thread Button */}
        <Button
          onClick={newThread}
          variant="outline"
          className="w-full justify-start gap-2 h-9"
        >
          <PlusIcon className="w-4 h-4" />
          New Thread
        </Button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingThreads ? (
          <div className="p-3 text-sm text-muted-foreground">Loading...</div>
        ) : threads.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No conversations yet</div>
        ) : (
          <ol className="space-y-1 p-2">
            {threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === currentThreadId}
                onSelect={() => switchToThread(thread.id)}
                onDelete={() => deleteThread(thread.id)}
              />
            ))}
          </ol>
        )}
      </div>
    </nav>
  );
};

interface ThreadItemProps {
  thread: { id: string; title: string; updatedAt: Date };
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ThreadItem = ({ thread, isActive, onSelect, onDelete }: ThreadItemProps) => {
  return (
    <li
      className={`group flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors ${
        isActive ? "bg-muted" : ""
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left text-sm truncate"
        title={thread.title}
      >
        {thread.title}
      </button>
      
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
      >
        <X className="w-3 h-3" />
        <span className="sr-only">Delete thread</span>
      </Button>
    </li>
  );
}; 