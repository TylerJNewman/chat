"use client";

import { AssistantRuntimeProvider, useExternalStoreRuntime, type AppendMessage } from "@assistant-ui/react";
import { type ReactNode, useState, useCallback, useRef, createContext, useContext, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChatStore, type ChatMessage } from "@/store/chat-store";
import { useQueryState } from "nuqs";


// Context for thread management
interface ThreadContextType {
  newThread: () => void;
  currentThreadId: string;
  isLoadingThread: boolean;
}

const ThreadContext = createContext<ThreadContextType | null>(null);

export const useThread = () => {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error("useThread must be used within ChatRuntimeProvider");
  }
  return context;
};

export const ChatRuntimeProvider = ({ children }: { children: ReactNode }) => {
  
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resourceId] = useState("user-123"); // Static resourceId for now
  const abortControllerRef = useRef<AbortController | null>(null);

  // Direct store subscriptions to avoid infinite re-renders
  const isLoadingThread = useChatStore((state) => state.isLoadingThread);
  const createNewThread = useChatStore((state) => state.createNewThread);
  const setIsLoadingThread = useChatStore((state) => state.setIsLoadingThread);
  const updateThread = useChatStore((state) => state.updateThread);
  const getThreadMessages = useChatStore((state) => state.getThreadMessages);
  const hasThreadMessages = useChatStore((state) => state.hasThreadMessages);
  const setThreadMessages = useChatStore((state) => state.setThreadMessages);
  const addMessageToThread = useChatStore((state) => state.addMessageToThread);
  const updateMessageInThread = useChatStore((state) => state.updateMessageInThread);
  
  
  // Use nuqs to persist current thread ID in URL
  const [currentThreadId, setCurrentThreadId] = useQueryState('thread', {
    defaultValue: '',
    clearOnDefault: true,
  });
  

  const generateId = useCallback(() => uuidv4(), []);

  // Background sync for message persistence
  const syncMessagesToBackend = useCallback(async (threadId: string, messages: ChatMessage[]) => {
    try {
      await fetch(`/api/threads/${threadId}/messages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
          })),
        }),
      });
    } catch (error) {
      console.warn('Failed to sync messages to backend:', error);
      // Don't throw - this is background sync, we don't want to break the UI
    }
  }, []);

  // Don't auto-create threads - let user start conversation naturally

  // Background fetch of thread messages from API
  const fetchThreadMessagesFromAPI = useCallback(async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          const fetchedMessages = data.messages.map((msg: { id?: string; role: string; content: string; createdAt?: string }) => ({
            id: msg.id || generateId(),
            role: msg.role as "user" | "assistant",
            content: msg.content,
            createdAt: new Date(msg.createdAt || Date.now()),
          }));
          
          // Cache the messages in store and update UI
          setThreadMessages(threadId, fetchedMessages);
          setMessages(fetchedMessages);
        }
      } else if (response.status !== 404) {
        // 404 is expected for new threads, but other errors should be logged
        console.error('Failed to load thread messages:', response.status);
      }
    } catch (error) {
      console.error('Error loading thread messages:', error);
    }
  }, [generateId, setThreadMessages]);

  // Load thread messages instantly from cache, fetch in background if needed
  const loadThreadMessages = useCallback(async (threadId: string) => {
    
    // Always check cache first and load instantly
    const hasCached = hasThreadMessages(threadId);
    
    if (hasCached) {
      const cachedMessages = getThreadMessages(threadId);
      setMessages(cachedMessages);
      return; // Don't fetch from API if we have cached data
    }

    // Only show loading and fetch from API if no cached data
    setIsLoadingThread(true);
    try {
      await fetchThreadMessagesFromAPI(threadId);
    } finally {
      setIsLoadingThread(false);
    }
  }, [hasThreadMessages, getThreadMessages, fetchThreadMessagesFromAPI, setIsLoadingThread]);

  // Load messages for current thread when threadId changes
  useEffect(() => {
    
    if (currentThreadId) {
      loadThreadMessages(currentThreadId);
    } else {
      // Clear messages when no thread is selected
      setMessages([]);
    }
  }, [currentThreadId, loadThreadMessages]);


  const convertMessage = useCallback((message: ChatMessage) => {
    return {
      id: message.id,
      role: message.role,
      content: [{ type: "text" as const, text: message.content }],
      createdAt: message.createdAt,
    };
  }, []);

  const onNew = useCallback(async (message: AppendMessage) => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Create thread if none exists (user is starting a conversation)
    let threadId = currentThreadId;
    let isNewThread = false;
    if (!threadId) {
      threadId = createNewThread();
      isNewThread = true;
      // Don't set URL yet - wait until message is sent successfully
    }
    
    try {
      
      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: typeof message.content === 'string' ? message.content : message.content[0]?.type === 'text' ? message.content[0].text : '',
        createdAt: new Date(),
      };

      // Add user message immediately (optimistic update)
      setMessages(prev => [...prev, userMessage]);
      if (threadId) {
        addMessageToThread(threadId, userMessage);
      }
      
      // Create assistant message placeholder
      const assistantMessageId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      if (threadId) {
        addMessageToThread(threadId, assistantMessage);
      }

      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Make API call with streaming
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          threadId,
          resourceId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedText = "";
      
      // Read the streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          // Handle Vercel AI SDK streaming format
          if (line.startsWith('0:')) {
            // Text chunk - extract the JSON string content
            const data = line.slice(2);
            try {
              const text = JSON.parse(data);
              accumulatedText += text;
              
              // Update the assistant message with accumulated text (optimistic update)
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: accumulatedText }
                  : msg
              ));
              if (threadId) {
                updateMessageInThread(threadId, assistantMessageId, { content: accumulatedText });
              }
            } catch (e) {
              console.warn('Failed to parse text chunk:', data);
            }
          } else if (line.startsWith('e:') || line.startsWith('d:')) {
            // End of stream
            break;
          }
        }
      }

      // Update thread title if this is the first message
      if (messages.length === 0) {
        const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
        updateThread(threadId, { title, updatedAt: new Date() });
      } else {
        // Just update the timestamp
        updateThread(threadId, { updatedAt: new Date() });
      }
      
      // Only update URL after successful message send to avoid race condition
      if (isNewThread) {
        setCurrentThreadId(threadId);
      }

      // Background sync messages to backend (don't await to avoid blocking UI)
      if (threadId) {
        const currentMessages = getThreadMessages(threadId);
        syncMessagesToBackend(threadId, currentMessages);
      }
      
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error("Error in chat:", error);
      
      // If this was a new thread and we failed, don't update URL
      if (isNewThread) {
        // Clear messages since we failed to send
        setMessages([]);
        // Also clear from store if we added optimistically
        if (threadId) {
          setThreadMessages(threadId, []);
        }
        return;
      }
      
      // Add error message for existing threads
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      if (threadId) {
        addMessageToThread(threadId, errorMessage);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [isRunning, messages, currentThreadId, resourceId, generateId, updateThread, createNewThread, setCurrentThreadId, addMessageToThread, updateMessageInThread, setThreadMessages, getThreadMessages, syncMessagesToBackend]);

  const onEdit = useCallback(async (message: AppendMessage) => {
    // Handle message editing - for now just log
    console.log("Edit message:", message);
    // In a full implementation, you'd update the message and regenerate from that point
  }, []);

  const onReload = useCallback(async (parentId: string | null, config: Record<string, unknown>) => {
    // Handle message reloading - for now just log
    console.log("Reload from:", parentId, config);
    // In a full implementation, you'd regenerate the last assistant message
  }, []);

  const handleNewThread = useCallback(() => {
    setMessages([]);
    const newThreadId = createNewThread();
    setCurrentThreadId(newThreadId);
  }, [createNewThread, setCurrentThreadId]);

  const runtime = useExternalStoreRuntime({
    isRunning: isRunning || isLoadingThread,
    messages,
    convertMessage,
    onNew,
    onEdit,
    onReload,
  });

  const threadContextValue = {
    newThread: handleNewThread,
    currentThreadId,
    isLoadingThread,
  };

  return (
    <ThreadContext.Provider value={threadContextValue}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </ThreadContext.Provider>
  );
}; 