import { Bot, Settings2, Sparkles, TerminalSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

// Minimal Placeholder for Chat Components to fit the AppShell
const ChatComposer = () => {
  const { t } = useTranslation('common');

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 pb-6">
      <div className="relative flex min-h-[56px] w-full flex-col rounded-xl border border-border-default bg-surface-2 p-3 shadow-2 focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition-all duration-base">
        <textarea
          placeholder={t('assistant.composerPlaceholder')}
          className="w-full resize-none bg-transparent px-2 text-sm text-primary placeholder:text-tertiary focus:outline-none min-h-[24px]"
          rows={1}
        />
        <div className="flex items-center justify-between pt-2 px-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-tertiary hover:text-primary"
            >
              <span className="sr-only">{t('assistant.attachment')}</span>
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-tertiary font-medium bg-surface-3 px-2 py-1 rounded-sm border border-border-subtle">
              {t('assistant.currentModel')}
            </div>
            <Button size="sm" className="h-8 rounded-sm">
              {t('assistant.send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuggestedActions = () => {
  const { t } = useTranslation('common');

  const actions = [
    {
      title: t('assistant.suggestion.review'),
      icon: <TerminalSquare className="size-4" />,
    },
    { title: t('assistant.suggestion.fix'), icon: <Bot className="size-4" /> },
    {
      title: t('assistant.suggestion.release'),
      icon: <Sparkles className="size-4" />,
    },
  ];
  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-wrap justify-center gap-3 px-4">
      {actions.map((act, i) => (
        <button
          key={i}
          className="flex items-center gap-2 rounded-full border border-border-default bg-surface-2 px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-3 hover:text-primary"
        >
          {act.icon}
          {act.title}
        </button>
      ))}
    </div>
  );
};

const ContextDrawer = () => {
  const { t } = useTranslation('common');

  return (
    <div className="hidden w-[320px] shrink-0 flex-col border-l border-border-default bg-surface-1 xl:flex h-[calc(100vh-64px)] fixed right-0 top-[64px] overflow-y-auto">
      <div className="sticky top-0 flex items-center justify-between border-b border-glass-border bg-glass-bg backdrop-blur-[20px] p-4">
        <h3 className="font-semibold text-primary">{t('assistant.context')}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-tertiary hover:text-primary"
        >
          <Settings2 className="size-4" />
        </Button>
      </div>
      <div className="p-4 flex flex-col gap-6">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3">
            {t('assistant.model')}
          </h4>
          <div className="rounded-md border border-border-default bg-surface-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                {t('assistant.currentModel')}
              </span>
              <span className="rounded bg-success-soft-bg px-1.5 py-0.5 text-micro font-bold text-success">
                {t('dashboard.active')}
              </span>
            </div>
            <p className="mt-1 text-xs text-tertiary">
              {t('assistant.maxTokens')}
            </p>
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3">
            {t('assistant.tools')}
          </h4>
          <div className="flex flex-col gap-2">
            {[
              t('assistant.tool.search'),
              t('assistant.tool.github'),
              t('assistant.tool.shell'),
            ].map((tool) => (
              <div
                key={tool}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 p-2 px-3 text-sm"
              >
                <span className="text-secondary">{tool}</span>
                <div className="size-2 rounded-full bg-success"></div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3">
            {t('assistant.metrics')}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-surface-2 p-3 text-center border border-border-default">
              <div className="text-tertiary text-xs">
                {t('assistant.tokens')}
              </div>
              <div className="font-mono text-primary font-medium mt-1">
                4.2k
              </div>
            </div>
            <div className="rounded-md bg-surface-2 p-3 text-center border border-border-default">
              <div className="text-tertiary text-xs">
                {t('assistant.latency')}
              </div>
              <div className="font-mono text-primary font-medium mt-1">
                1.2s
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const DashboardRoute = () => {
  const { t } = useTranslation('common');

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden -m-4 sm:-m-6">
      {/* Main Conversation Area */}
      <div className="flex flex-1 flex-col xl:mr-[320px]">
        {/* Messages / Empty State */}
        <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col">
          <div className="m-auto flex w-full max-w-[920px] flex-col items-center justify-center text-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-sm bg-surface-3 ring-1 ring-border-default shadow-1">
              <Bot className="size-8 text-accent" />
            </div>
            <h1 className="text-display-m font-semibold text-primary mb-2">
              {t('assistant.heroTitle')}
            </h1>
            <p className="text-secondary mb-8">
              {t('assistant.heroDescription')}
            </p>
            <SuggestedActions />
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 bg-surface-1 pt-2">
          <ChatComposer />
          <div className="pb-4 text-center text-xs text-tertiary">
            {t('assistant.disclaimer')}
          </div>
        </div>
      </div>

      {/* Right Drawer (Context) */}
      <ContextDrawer />
    </div>
  );
};

export default DashboardRoute;
