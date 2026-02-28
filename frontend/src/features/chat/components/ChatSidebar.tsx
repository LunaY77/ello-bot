import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils/cn';

type ChatSidebarProps = {
  open: boolean;
  onToggle: () => void;
};

export const ChatSidebar = ({ open, onToggle }: ChatSidebarProps) => {
  const { t } = useTranslation('chat');

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onToggle}
        />
      )}

      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-gray-50 transition-transform duration-300 dark:bg-gray-950 md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Top: New Chat button */}
        <div className="flex items-center justify-between p-3">
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 md:hidden"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <button className="flex flex-1 items-center gap-2 rounded-lg p-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-800">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('sidebar.newChat')}
          </button>
        </div>

        {/* Middle: Chat list */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            {t('sidebar.noChats')}
          </div>
        </div>

        {/* Bottom: User section */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-800">
            <div className="flex size-7 items-center justify-center rounded-full bg-gray-300 text-xs font-bold dark:bg-gray-700">
              U
            </div>
            <span className="flex-1 truncate">User</span>
          </div>
        </div>
      </nav>
    </>
  );
};
