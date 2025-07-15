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
        const messages = state.threadMessages[threadId] || [];
        console.log('🏪 Store: getThreadMessages for', threadId, ':', messages.length, 'messages');
        return messages;
      },
      
      hasThreadMessages: (threadId: string) => {
        const state = get();
        const hasMessages = threadId in state.threadMessages;
        console.log('🏪 Store: hasThreadMessages for', threadId, ':', hasMessages);
        return hasMessages;
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
        console.log('🏪 Store: shouldRefreshThreads check:', { 
          lastFetched: state.threadsLastFetched,
          threadsCount: state.threads.length 
        });
        
        if (!state.threadsLastFetched) {
          console.log('🏪 Store: No last fetched time, should refresh');
          return true;
        }
        
        // Refresh if older than 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const shouldRefresh = state.threadsLastFetched < fiveMinutesAgo;
        console.log('🏪 Store: Should refresh:', shouldRefresh);
        return shouldRefresh;
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
      // Custom storage to handle Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) {
            return null;
          }
          
          const parsed = JSON.parse(str);
          // Convert date strings back to Date objects
          if (parsed.state?.threads) {
            parsed.state.threads = parsed.state.threads.map((thread: { id: string; title: string; updatedAt: string }) => ({
              ...thread,
              updatedAt: new Date(thread.updatedAt),
            }));
          }
          if (parsed.state?.threadsLastFetched) {
            parsed.state.threadsLastFetched = new Date(parsed.state.threadsLastFetched);
          }
          if (parsed.state?.threadMessages) {
            for (const threadId of Object.keys(parsed.state.threadMessages)) {
              parsed.state.threadMessages[threadId] = parsed.state.threadMessages[threadId].map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
                ...msg,
                createdAt: new Date(msg.createdAt),
              }));
            }
          }
          return parsed;
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