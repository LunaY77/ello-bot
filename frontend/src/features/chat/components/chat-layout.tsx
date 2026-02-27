import * as React from 'react';

import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ChatSidebar } from './chat-sidebar';

import { useCurrentUser } from '@/lib/auth';
import { cn } from '@/utils/cn';

export const ChatLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const user = useCurrentUser();

  return (
    <div className="flex h-screen max-h-[100dvh] flex-row text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main chat area */}
      <div
        className={cn(
          'flex w-full flex-1 flex-col',
          sidebarOpen && 'md:max-w-[calc(100%-260px)]',
        )}
      >
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="text-sm font-medium">Ello Bot</span>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <ChatMessages username={user.data?.username} />
        </div>

        {/* Input area */}
        <ChatInput />
      </div>
    </div>
  );
};
