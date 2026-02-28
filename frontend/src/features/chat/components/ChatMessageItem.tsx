import { useTranslation } from 'react-i18next';

import { cn } from '@/utils/cn';

type ChatMessageItemProps = {
  role: 'user' | 'assistant';
  content: string;
  avatar?: string;
  name?: string;
};

export const ChatMessageItem = ({
  role,
  content,
  avatar,
  name,
}: ChatMessageItemProps) => {
  const { t } = useTranslation('chat');
  const displayName =
    name || (role === 'user' ? t('message.you') : t('message.assistant'));

  return (
    <div className="group flex w-full px-4 py-3">
      {/* Avatar */}
      <div className="mr-3 flex-shrink-0">
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-full text-xs font-bold',
            role === 'assistant'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
          )}
        >
          {avatar ? (
            <img src={avatar} className="size-8 rounded-full" alt="" />
          ) : role === 'assistant' ? (
            'AI'
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      {/* Content */}
      <div className="w-0 max-w-full flex-auto">
        <div className="mb-0.5 text-sm font-semibold">{displayName}</div>
        <div className="prose max-w-none dark:prose-invert">{content}</div>

        {/* Action buttons — visible on hover */}
        <div className="mt-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            <svg
              className="size-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
