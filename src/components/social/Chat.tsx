import { useState, useEffect } from 'react';
import { Radio, Send, Smile } from 'lucide-react';
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
        return [...prev, incomingMessage].slice(-24);
      });
    }
  }, [incomingMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;
    onSendMessage(message);
    setMessages((current) => [...current, { id: Date.now(), author: 'You', text: message, isSystem: false }].slice(-24));
    setInput('');
  };

  const latestMessage = [...messages].reverse().find((message) => !message.isSystem);

  return (
    <div className="pointer-events-auto relative flex h-20 items-center border-t border-white/[0.07] bg-gradient-to-t from-[#07171c]/98 via-[#0b2026]/95 to-[#10252d]/88 px-2.5 shadow-[0_-18px_42px_rgba(3,14,18,.34)] backdrop-blur-2xl sm:px-4">
      {latestMessage ? (
        <div className="pointer-events-none absolute -top-10 left-1/2 flex max-w-[86%] -translate-x-1/2 items-center gap-2 truncate rounded-2xl border border-emerald-200/15 bg-[#0c252c]/94 px-3 py-1.5 text-[11px] text-white/80 shadow-xl backdrop-blur-xl">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_9px_rgba(110,231,183,.8)]" />
          <span className="font-black text-amber-200">{latestMessage.author}</span><span className="truncate">{latestMessage.text}</span>
        </div>
      ) : null}
      <form onSubmit={handleSend} className="group mx-auto flex w-full max-w-3xl items-center gap-1.5 rounded-2xl border border-white/10 bg-[#102c33]/90 p-1.5 shadow-[inset_0_1px_rgba(255,255,255,.05),0_8px_28px_rgba(0,0,0,.2)] transition focus-within:border-emerald-200/35 focus-within:bg-[#12343c]">
        <div className="hidden items-center gap-1.5 border-r border-white/10 px-2.5 sm:flex">
          <Radio size={13} className="text-emerald-300" />
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/70">Plaza</span>
        </div>
        <button type="button" aria-label="Add wave emoji" onClick={() => setInput((value) => `${value}👋`)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-amber-200">
          <Smile size={18} />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={input}
            maxLength={160}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Room chat message"
            placeholder="Message everyone nearby…"
            className="h-10 w-full min-w-0 bg-transparent px-1 text-[15px] font-medium text-white placeholder:text-white/35 focus:outline-none"
          />
          {input.length > 120 ? <span className="absolute right-1 top-0 text-[9px] font-bold text-white/30">{160 - input.length}</span> : null}
        </div>
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Send room message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-300 text-[#10252d] shadow-[0_5px_16px_rgba(251,191,36,.2)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
