import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Thread {
  id: string;
  title: string;
  updatedAt: Date;
}

interface ChatStore {
  // Thread management
  threads: Thread[];
  
  // Loading states
  isLoadingThreads: boolean;
  isLoadingThread: boolean;
  
  // Actions
  setThreads: (threads: Thread[]) => void;
  addThread: (thread: Thread) => void;
  removeThread: (threadId: string) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  setIsLoadingThreads: (loading: boolean) => void;
  setIsLoadingThread: (loading: boolean) => void;
  
  // Helper actions
  createNewThread: () => string;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      threads: [],
      isLoadingThreads: false,
      isLoadingThread: false,
      
      // Actions
      
      setThreads: (threads: Thread[]) => 
        set({ threads }),
      
      addThread: (thread: Thread) => 
        set((state) => ({ 
          threads: [thread, ...state.threads].slice(0, 50) // Keep max 50 threads
        })),
      
      removeThread: (threadId: string) => 
        set((state) => ({ 
          threads: state.threads.filter(t => t.id !== threadId)
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
      // Only persist certain fields
      partialize: (state) => ({
        threads: state.threads,
      }),
      // Custom storage to handle Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          const parsed = JSON.parse(str);
          // Convert date strings back to Date objects
          if (parsed.state?.threads) {
            parsed.state.threads = parsed.state.threads.map((thread: { id: string; title: string; updatedAt: string }) => ({
              ...thread,
              updatedAt: new Date(thread.updatedAt),
            }));
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