import { useTranslation } from 'react-i18next';

type ChatPlaceholderProps = {
  username: string;
};

const SUGGESTIONS = [
  { key: 'suggestion1', label: 'placeholder.suggestion1' },
  { key: 'suggestion2', label: 'placeholder.suggestion2' },
  { key: 'suggestion3', label: 'placeholder.suggestion3' },
  { key: 'suggestion4', label: 'placeholder.suggestion4' },
];

export const ChatPlaceholder = ({ username }: ChatPlaceholderProps) => {
  const { t } = useTranslation('chat');

  return (
    <div className="m-auto w-full max-w-6xl px-8 lg:px-20">
      {/* Bot avatar */}
      <div className="mb-0.5 flex -space-x-4">
        <div className="flex size-[2.7rem] items-center justify-center rounded-full border bg-gray-100 text-sm font-bold dark:bg-gray-800">
          AI
        </div>
      </div>

      {/* Greeting */}
      <div className="mb-4 mt-2 text-3xl text-gray-800 dark:text-gray-100">
        {t('placeholder.greeting', { name: username })}
      </div>

      {/* Subtitle */}
      <div className="text-base text-gray-500 dark:text-gray-400">
        {t('placeholder.subtitle')}
      </div>

      {/* Suggestion prompts */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.key}
            className="rounded-xl border border-gray-200 p-3 text-left text-sm transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            {t(s.label)}
          </button>
        ))}
      </div>
    </div>
  );
};
