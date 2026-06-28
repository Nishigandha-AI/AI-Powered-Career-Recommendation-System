import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import api from "../../lib/api";
import { toast } from "sonner";
import { Send, MessageSquare, Sparkles } from "lucide-react";

const STARTERS = [
  "Help me improve my resume for a software engineering role",
  "What skills should I learn next based on my goals?",
  "Give me 5 common interview questions for data analyst roles",
  "How do I write a cover letter that stands out?",
];

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/chat/history").then((r) => {
      const hist = r.data || [];
      const expanded = [];
      hist.forEach((m, idx) => {
        expanded.push({ id: `u-${m.created_at || idx}`, role: "user", content: m.user_message });
        expanded.push({ id: `a-${m.created_at || idx}`, role: "assistant", content: m.assistant_message });
      });
      setMessages(expanded);
      if (hist[0]?.session_id) setSessionId(hist[0].session_id);
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const t = (text || input).trim();
    if (!t || sending) return;
    setInput("");
    const ts = Date.now();
    setMessages((prev) => [...prev, { id: `u-${ts}`, role: "user", content: t }]);
    setSending(true);
    try {
      const r = await api.post("/chat", { message: t, session_id: sessionId });
      setSessionId(r.data.session_id);
      setMessages((prev) => [...prev, { id: `a-${ts}`, role: "assistant", content: r.data.reply }]);
    } catch {
      toast.error("Chat failed");
      setMessages((prev) => [...prev, { id: `a-${ts}-err`, role: "assistant", content: "Sorry, I ran into an error. Please try again." }]);
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-8 lg:p-12 pb-4 border-b border-[#DEE2E6] bg-white">
        <div className="overline text-[#002FA7] mb-2">AI Career Coach</div>
        <h1 className="font-heading text-3xl font-black tracking-tight leading-none">Chat with CareerMap</h1>
        <p className="text-sm text-[#495057] mt-1">Resume tips, interview prep, skill planning, and more.</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
        <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-5" data-testid="chat-messages">
          {messages.length === 0 && (
            <div className="text-center pt-12">
              <MessageSquare className="mx-auto text-[#002FA7] mb-4" size={36} />
              <div className="font-heading text-xl font-bold mb-2">Ask me anything about your career</div>
              <p className="text-sm text-[#495057] mb-6">Try a starter prompt or type your own.</p>
              <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left p-4 bg-white border border-[#DEE2E6] hover:border-[#002FA7] transition-all text-sm" data-testid={`starter-${s.substring(0,20).replace(/[^a-z]/gi,'-').toLowerCase()}`}>
                    <Sparkles size={14} className="inline text-[#002FA7] mr-1 -mt-0.5" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`chat-msg-${m.id}`}>
              <div className={`max-w-[80%] p-4 ${m.role === 'user' ? 'bg-[#002FA7] text-white' : 'bg-white border border-[#DEE2E6]'}`}>
                {m.role === 'assistant' ? (
                  <div className="prose-chat text-sm">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#DEE2E6] p-4 text-sm text-[#868E96]">Thinking...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-[#DEE2E6] bg-white p-4">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="max-w-4xl mx-auto flex gap-2" data-testid="chat-form">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your career..." className="input-swiss flex-1" data-testid="chat-input" />
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="chat-send-btn">
            <Send size={16} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
