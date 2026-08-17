import { useState, useEffect, useRef } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (incomingMessage) {
      setMessages(prev => {
        // Prevent duplicates if React runs the effect twice rapidly
        if (prev.some(m => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
    }
  }, [incomingMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="h-48 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 flex flex-col pointer-events-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`text-sm ${m.isSystem ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>
            {!m.isSystem && <span className="font-semibold text-blue-400 mr-2">{m.author}:</span>}
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
