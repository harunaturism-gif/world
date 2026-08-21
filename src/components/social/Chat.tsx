import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage } from '../world/Room';

interface ChatProps {
  onSendMessage: (text: string) => void;
  incomingMessage: ChatMessage | null;
}

export function Chat({ onSendMessage, incomingMessage }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, author: 'System', text: 'Welcome to Central Plaza', isSystem: true }
  ]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (incomingMessage) {
      setMessages(prev => {
        // Prevent duplicates if React runs the effect twice rapidly
        if (prev.some(m => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
    }
  }, [incomingMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;
    onSendMessage(message);
    setMessages((current) => [...current, { id: Date.now(), author: 'You', text: message, isSystem: false }]);
    setInput('');
  };

  const latestMessage = [...messages].reverse().find((message) => !message.isSystem);

  return (
    <div className="relative flex h-16 items-center border-t border-amber-100/10 bg-[#10252d]/88 px-3 shadow-[0_-14px_36px_rgba(5,20,25,.22)] backdrop-blur-xl pointer-events-auto">
      {latestMessage ? (
        <div className="pointer-events-none absolute -top-8 left-1/2 max-w-[80%] -translate-x-1/2 truncate rounded-full border border-white/10 bg-[#16343c]/90 px-3 py-1 text-[11px] text-white/75 shadow-lg">
          <span className="mr-1 font-bold text-amber-200">{latestMessage.author}</span>{latestMessage.text}
        </div>
      ) : null}
      <form onSubmit={handleSend} className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-white/10 bg-[#0b1b21]/72 p-1.5 pl-3 shadow-inner">
        <span className="hidden text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300/80 sm:inline">Local</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Room chat message"
          placeholder="Say something in the plaza…"
          className="min-w-0 flex-1 bg-transparent px-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send room message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[#10252d] transition-colors hover:bg-amber-100"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
