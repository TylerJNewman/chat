"use client";

import { AssistantRuntimeProvider, useExternalStoreRuntime, type AppendMessage } from "@assistant-ui/react";
import { type ReactNode, useState, useCallback, useRef, createContext, useContext, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChatStore } from "@/store/chat-store";
import { useQueryState } from "nuqs";

// Simplified message type that matches what we need
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

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

  // Zustand store
  const {
    createNewThread,
    isLoadingThread,
    setIsLoadingThread,
    updateThread,
  } = useChatStore();
  
  // Use nuqs to persist current thread ID in URL
  const [currentThreadId, setCurrentThreadId] = useQueryState('thread', {
    defaultValue: '',
    clearOnDefault: true,
  });

  const generateId = useCallback(() => uuidv4(), []);

  // Don't auto-create threads - let user start conversation naturally

  // Load thread messages from API
  const loadThreadMessages = useCallback(async (threadId: string) => {
    setIsLoadingThread(true);
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
          setMessages(data.messages.map((msg: { id?: string; role: string; content: string; createdAt?: string }) => ({
            id: msg.id || generateId(),
            role: msg.role as "user" | "assistant",
            content: msg.content,
            createdAt: new Date(msg.createdAt || Date.now()),
          })));
        }
      } else if (response.status !== 404) {
        // 404 is expected for new threads, but other errors should be logged
        console.error('Failed to load thread messages:', response.status);
      }
    } catch (error) {
      console.error('Error loading thread messages:', error);
    } finally {
      setIsLoadingThread(false);
    }
  }, [generateId, setIsLoadingThread]);

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
    
    try {
      // Create thread if none exists (user is starting a conversation)
      let threadId = currentThreadId;
      if (!threadId) {
        threadId = createNewThread();
        setCurrentThreadId(threadId);
      }
      
      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: typeof message.content === 'string' ? message.content : message.content[0]?.type === 'text' ? message.content[0].text : '',
        createdAt: new Date(),
      };

      // Add user message immediately
      setMessages(prev => [...prev, userMessage]);
      
      // Create assistant message placeholder
      const assistantMessageId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

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
              
              // Update the assistant message with accumulated text
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: accumulatedText }
                  : msg
              ));
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
      
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error("Error in chat:", error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [isRunning, messages, currentThreadId, resourceId, generateId, updateThread, createNewThread, setCurrentThreadId]);

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