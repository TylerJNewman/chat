import { Thread } from "@/components/thread";
import { ChatRuntimeProvider } from "@/components/chat-runtime-provider";
import { ThreadList } from "@/components/thread-list";

export default function Home() {
  return (
    <ChatRuntimeProvider>
      <div className="h-screen flex">
        {/* Sidebar with Thread List */}
        <ThreadList />
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <Thread />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}
