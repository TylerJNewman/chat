"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, X } from "lucide-react";
import { useThread } from "./chat-runtime-provider";
import { useEffect, useCallback, useState, memo } from "react";
import { useChatStore } from "@/store/chat-store";
import { useQueryState } from "nuqs";

export const ThreadList = () => {
  
  // Use direct store access without mapping to avoid infinite re-renders
  const threads = useChatStore((state) => state.threads);
  const isLoadingThreads = useChatStore((state) => state.isLoadingThreads);
  const _hasHydrated = useChatStore((state) => state._hasHydrated);
  const shouldRefreshThreads = useChatStore((state) => state.shouldRefreshThreads);
  
  // Separate actions to avoid re-renders
  const setThreadsWithTimestamp = useChatStore((state) => state.setThreadsWithTimestamp);
  const removeThread = useChatStore((state) => state.removeThread);
  const setIsLoadingThreads = useChatStore((state) => state.setIsLoadingThreads);
  const preloadThreadMessages = useChatStore((state) => state.preloadThreadMessages);
  
  
  // Use nuqs to persist current thread ID in URL
  const [currentThreadId, setCurrentThreadId] = useQueryState('thread', {
    defaultValue: '',
    clearOnDefault: true,
  });

  // Track if we've initialized (to prevent flash)
  const [hasInitialized, setHasInitialized] = useState(false);

  // Background refresh of threads from API
  const refreshThreadsFromAPI = useCallback(async () => {
    
    try {
      const response = await fetch("/api/threads", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedThreads = data.threads || [];
        
        setThreadsWithTimestamp(fetchedThreads);
        
        // Precache messages for first 30 threads in background
        const threadIds = fetchedThreads.slice(0, 30).map((t: { id: string }) => t.id);
        if (threadIds.length > 0) {
          preloadThreadMessages(threadIds).catch(error => 
            console.warn("Failed to preload thread messages:", error)
          );
        }
      } else {
        console.error("Failed to load threads:", response.status);
      }
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      // API fetch complete
    }
  }, [setThreadsWithTimestamp, preloadThreadMessages]);

  // Initialize threads - use cache immediately if available
  const initializeThreads = useCallback(() => {
    // Early return if not hydrated or already initialized
    if (!_hasHydrated || hasInitialized) {
      return;
    }
    
    // Always show cached threads immediately if available
    if (threads.length > 0) {
      setHasInitialized(true);
      
      // Background refresh if data is stale (non-blocking)
      if (shouldRefreshThreads()) {
        setTimeout(() => refreshThreadsFromAPI(), 0);
      }
    } else {
      setIsLoadingThreads(true);
      refreshThreadsFromAPI().finally(() => {
        setIsLoadingThreads(false);
        setHasInitialized(true);
      });
    }
  }, [_hasHydrated, threads.length, shouldRefreshThreads, refreshThreadsFromAPI, setIsLoadingThreads, hasInitialized]);

  // Initialize threads on mount and when store hydrates
  useEffect(() => {
    initializeThreads();
  }, [initializeThreads]);

  // Ensure thread is selected when URL changes (e.g., on refresh)
  useEffect(() => {
    // If we have a thread ID in the URL but no threads loaded yet, wait for threads to load
    if (currentThreadId && hasInitialized && threads.length > 0) {
      const threadExists = threads.some(thread => thread.id === currentThreadId);
      if (!threadExists) {
        // Thread doesn't exist in our list, navigate to home
        setCurrentThreadId('');
      }
    }
  }, [currentThreadId, threads, hasInitialized, setCurrentThreadId]);

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
        
        // If we deleted the current thread, navigate to home
        if (threadId === currentThreadId) {
          setCurrentThreadId('');
          // Let the ChatRuntimeProvider handle creating a new thread when URL is cleared
        }
        
        // Refresh the thread list from the server to ensure sync
        await refreshThreadsFromAPI();
      } else {
        console.error("Failed to delete thread:", response.status);
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  }, [removeThread, currentThreadId, refreshThreadsFromAPI, setCurrentThreadId]);

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
              // Let the ChatRuntimeProvider handle creating a new thread when URL is cleared
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
          {!_hasHydrated ? (
            // Show blank space while hydrating (no flash)
            <div className="py-2" />
          ) : !hasInitialized ? (
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

const ThreadItem = memo(({ thread, isActive, onSelect, onDelete }: ThreadItemProps) => {
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
});

ThreadItem.displayName = 'ThreadItem'; 