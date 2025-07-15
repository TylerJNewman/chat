"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, X } from "lucide-react";
import { useThread } from "./chat-runtime-provider";
import { useEffect, useCallback, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useQueryState } from "nuqs";

export const ThreadList = () => {
  const { newThread } = useThread();
  const {
    threads,
    setThreads,
    removeThread,
    isLoadingThreads,
    setIsLoadingThreads,
  } = useChatStore();
  
  // Use nuqs to persist current thread ID in URL
  const [currentThreadId, setCurrentThreadId] = useQueryState('thread', {
    defaultValue: '',
    clearOnDefault: true,
  });

  // Track if we've initialized (to prevent flash)
  const [hasInitialized, setHasInitialized] = useState(false);

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
      setHasInitialized(true);
    }
  }, [setThreads, setIsLoadingThreads]);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Remove from local store immediately for responsive UI
        removeThread(threadId);
        
        // If we deleted the current thread, create a new one
        if (threadId === currentThreadId) {
          setCurrentThreadId('');
          newThread();
        }
        
        // Refresh the thread list from the server to ensure sync
        await loadThreads();
      } else {
        console.error("Failed to delete thread:", response.status);
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  }, [removeThread, currentThreadId, newThread, loadThreads, setCurrentThreadId]);

  // Switch to thread
  const switchToThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    // The ChatRuntimeProvider will automatically load messages for this thread
  };

  return (
    <nav className="bg-muted/40 border-r min-h-full overflow-hidden w-64 flex flex-col p-2">
      <div className="flex flex-col gap-3">
        <div className="px-1.5">
          <h2 className="font-semibold text-sm text-muted-foreground mb-2">TJ Chat</h2>
          
          {/* New Thread Button */}
          <Button
            onClick={() => {
              setCurrentThreadId('');
              newThread();
            }}
            variant="outline"
            className="w-full justify-center gap-2 h-9"
          >
            New Chat
          </Button>
        </div>

        {/* Contained separator */}
        <div className="border-b border-muted-foreground/20 mx-1.5" />

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto px-1.5">
          {!hasInitialized ? (
            // Show blank space while initializing (no flash)
            <div className="py-2" />
          ) : isLoadingThreads ? (
            <div className="py-2 text-sm text-muted-foreground">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">No conversations yet</div>
          ) : (
            <ol className="space-y-1">
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
    <li className="group relative">
      <Button
        onClick={onSelect}
        variant="ghost"
        className={`w-full justify-start px-2 py-1.5 h-auto text-left font-normal transition-colors group-hover:bg-muted/60 ${
          isActive ? "bg-muted group-hover:bg-muted" : ""
        }`}
      >
        <span className="flex-1 text-sm truncate pr-8" title={thread.title}>
          {thread.title}
        </span>
      </Button>
      
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
      >
        <X className="w-3 h-3" />
        <span className="sr-only">Delete thread</span>
      </Button>
    </li>
  );
}; 