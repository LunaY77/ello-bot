import * as React from 'react';
import { useTranslation } from 'react-i18next';

export const ChatInput = () => {
  const { t } = useTranslation('chat');
  const [message, setMessage] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!message.trim()) return;
    // TODO: send message
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <div className="w-full pb-4">
      <div className="mx-auto flex max-w-4xl flex-col px-3">
        <div className="flex flex-col rounded-3xl border border-gray-200/50 bg-white px-1 shadow-lg backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/50">
          {/* Textarea */}
          <div className="px-3 pt-3 pb-1">
            <textarea
              ref={textareaRef}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-gray-400"
              placeholder={t('input.placeholder')}
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="mx-1 mb-2 mt-0.5 flex items-center justify-between">
            {/* Left: attachment button */}
            <div className="ml-1 flex items-center">
              <button className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
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
              </button>
            </div>

            {/* Right: send button */}
            <div className="mr-1">
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className="rounded-full bg-black p-1.5 text-white transition hover:bg-gray-800 disabled:opacity-30 dark:bg-white dark:text-black dark:hover:bg-gray-200"
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
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
