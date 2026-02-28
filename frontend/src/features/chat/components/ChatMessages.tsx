import * as React from 'react';

import { ChatMessageItem } from './ChatMessageItem';
import { ChatPlaceholder } from './ChatPlaceholder';

// Demo messages for UI skeleton
const DEMO_MESSAGES = [
  { id: '1', role: 'user' as const, content: 'Hello! What can you do?' },
  {
    id: '2',
    role: 'assistant' as const,
    content:
      "Hi! I'm your AI assistant. I can help you with coding, writing, brainstorming, and much more. What would you like to work on today?",
  },
];

type ChatMessagesProps = {
  username?: string;
};

export const ChatMessages = ({ username = 'User' }: ChatMessagesProps) => {
  const [messages] = React.useState(DEMO_MESSAGES);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center">
        <ChatPlaceholder username={username} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pt-8">
      {messages.map((msg) => (
        <ChatMessageItem key={msg.id} role={msg.role} content={msg.content} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
