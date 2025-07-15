import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Thread {
  id: string;
  title: string;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface ChatStore {
  // Thread management
  threads: Thread[];
  threadsLastFetched: Date | null;
  
  // Message storage - threadId -> messages
  threadMessages: Record<string, ChatMessage[]>;
  
  // Loading states
  isLoadingThreads: boolean;
  isLoadingThread: boolean;
  _hasHydrated: boolean;
  
  // Actions
  setThreads: (threads: Thread[]) => void;
  setThreadsWithTimestamp: (threads: Thread[]) => void;
  addThread: (thread: Thread) => void;
  removeThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  setIsLoadingThreads: (loading: boolean) => void;
  setIsLoadingThread: (loading: boolean) => void;
  
  // Message actions
  setThreadMessages: (threadId: string, messages: ChatMessage[]) => void;
  addMessageToThread: (threadId: string, message: ChatMessage) => void;
  updateMessageInThread: (threadId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  getThreadMessages: (threadId: string) => ChatMessage[];
  hasThreadMessages: (threadId: string) => boolean;
  clearThreadMessages: (threadId: string) => void;
  
  // Caching helpers
  shouldRefreshThreads: () => boolean;
  preloadThreadMessages: (threadIds: string[]) => Promise<void>;
  
  
  // Helper actions
  createNewThread: () => string;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
        // Initial state
        threads: [],
        threadsLastFetched: null,
        threadMessages: {},
        isLoadingThreads: false,
        isLoadingThread: false,
        _hasHydrated: false,
      
      // Actions
      
      setThreads: (threads: Thread[]) => 
        set({ threads }),
      
      setThreadsWithTimestamp: (threads: Thread[]) =>
        set({ threads, threadsLastFetched: new Date() }),
      
      addThread: (thread: Thread) => 
        set((state) => ({ 
          threads: [thread, ...state.threads].slice(0, 50) // Keep max 50 threads
        })),
      
      removeThread: (threadId: string) => 
        set((state) => ({ 
          threads: state.threads.filter(t => t.id !== threadId),
          threadMessages: Object.fromEntries(
            Object.entries(state.threadMessages).filter(([id]) => id !== threadId)
          )
        })),
      
      updateThread: (threadId: string, updates: Partial<Thread>) => 
        set((state) => ({
          threads: state.threads.map(t => 
            t.id === threadId ? { ...t, ...updates } : t
          )
        })),
      
      setIsLoadingThreads: (loading: boolean) => 
        set({ isLoadingThreads: loading }),
      
      setIsLoadingThread: (loading: boolean) => 
        set({ isLoadingThread: loading }),
      
      // Message actions
      setThreadMessages: (threadId: string, messages: ChatMessage[]) =>
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: messages
          }
        })),
      
      addMessageToThread: (threadId: string, message: ChatMessage) =>
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: [...(state.threadMessages[threadId] || []), message]
          }
        })),
      
      updateMessageInThread: (threadId: string, messageId: string, updates: Partial<ChatMessage>) =>
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: (state.threadMessages[threadId] || []).map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            )
          }
        })),
      
      getThreadMessages: (threadId: string) => {
        const state = get();
        return state.threadMessages[threadId] || [];
      },
      
      hasThreadMessages: (threadId: string) => {
        const state = get();
        return threadId in state.threadMessages;
      },
      
      clearThreadMessages: (threadId: string) =>
        set((state) => ({
          threadMessages: Object.fromEntries(
            Object.entries(state.threadMessages).filter(([id]) => id !== threadId)
          )
        })),
      
      // Caching helpers
      shouldRefreshThreads: () => {
        const state = get();
        
        if (!state.threadsLastFetched) {
          return true;
        }
        
        // Refresh if older than 5 minutes (300000ms)
        return (Date.now() - state.threadsLastFetched.getTime()) > 300000;
      },
      
      preloadThreadMessages: async (threadIds: string[]) => {
        const state = get();
        
        // Filter to only threads that don't have cached messages
        const uncachedThreadIds = threadIds.filter(id => !state.threadMessages[id]);
        
        if (uncachedThreadIds.length === 0) return;
        
        // Fetch messages for uncached threads in parallel
        const fetchPromises = uncachedThreadIds.map(async (threadId) => {
          try {
            const response = await fetch(`/api/threads/${threadId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.messages && Array.isArray(data.messages)) {
                const messages = data.messages.map((msg: { id?: string; role: string; content: string; createdAt?: string }) => ({
                  id: msg.id || crypto.randomUUID(),
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                  createdAt: new Date(msg.createdAt || Date.now()),
                }));
                
                // Cache the messages
                set((currentState) => ({
                  threadMessages: {
                    ...currentState.threadMessages,
                    [threadId]: messages
                  }
                }));
              }
            }
          } catch (error) {
            console.warn(`Failed to preload messages for thread ${threadId}:`, error);
          }
        });
        
        await Promise.allSettled(fetchPromises);
      },
      
      
      createNewThread: () => {
        const newThreadId = crypto.randomUUID();
        const newThread: Thread = {
          id: newThreadId,
          title: 'New conversation',
          updatedAt: new Date(),
        };
        
        set((state) => ({
          threads: [newThread, ...state.threads].slice(0, 50)
        }));
        
        return newThreadId;
      },
      }),
    {
      name: 'chat-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
      // Only persist certain fields (exclude _hasHydrated)
      partialize: (state) => ({
        threads: state.threads,
        threadsLastFetched: state.threadsLastFetched,
        threadMessages: state.threadMessages,
      }),
      // Add optimistic updates for better UX
      version: 1,
      // Custom storage to handle Date objects - optimized for speed
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) {
            return null;
          }
          
          try {
            const parsed = JSON.parse(str);
            
            // Fast date conversion - only process if data exists
            if (parsed.state) {
              const { state } = parsed;
              
              // Convert thread dates
              if (state.threads?.length > 0) {
                for (let i = 0; i < state.threads.length; i++) {
                  state.threads[i].updatedAt = new Date(state.threads[i].updatedAt);
                }
              }
              
              // Convert last fetched date
              if (state.threadsLastFetched) {
                state.threadsLastFetched = new Date(state.threadsLastFetched);
              }
              
              // Convert message dates
              if (state.threadMessages) {
                for (const threadId in state.threadMessages) {
                  const messages = state.threadMessages[threadId];
                  for (let i = 0; i < messages.length; i++) {
                    messages[i].createdAt = new Date(messages[i].createdAt);
                  }
                }
              }
            }
            
            return parsed;
          } catch (error) {
            console.warn('Failed to parse stored data:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
); 