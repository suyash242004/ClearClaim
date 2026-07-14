import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import axios from "axios";
import { Bot, X, Send, MessageSquare, Loader, Sparkles } from "lucide-react";

interface Message {
  sender: "user" | "assistant";
  text: string;
}

const QUICK_PROMPTS = [
  "Check my latest claim status",
  "What active policies do I have?",
  "Recommend a plan (Age: 35, Budget: 15k)",
  "What is my Health Guardian care plan?"
];

export default function ChatWidget() {
  const { isLoggedIn, role, userId } = useSelector((state: RootState) => state.auth);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "assistant", text: "Hello! I am **ClearClaim AI**, your dedicated healthcare assistant. How can I help you today? You can check your claims, policies, risk profile, or ask for policy recommendations!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, open]);

  // Only render if customer is logged in
  if (!isLoggedIn || role !== "customer" || !userId) return null;

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMessage: Message = { sender: "user", text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Map history to backend expected structure
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await axios.post("http://127.0.0.1:8000/agent/chat", {
        customer_id: userId,
        message: textToSend,
        history: historyPayload
      }, { timeout: 90000 });

      const assistantMessage: Message = {
        sender: "assistant",
        text: response.data.response || "I apologize, I didn't catch that. Could you repeat?"
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMsg = "⚠️ Sorry, I'm having trouble connecting to the ClearClaim AI gateway. Please make sure the backend agents are running.";
      
      // Check if it's the Gemini 403 Denied Access error from the backend
      if (error.response?.data?.detail?.includes("403") || error.response?.data?.detail?.includes("denied access")) {
        errorMsg = "⚠️ Gemini API Error: Your API key has been denied access by Google. Please check your billing or generate a new key in your .env file.";
      }

      setMessages(prev => [
        ...prev,
        { sender: "assistant", text: errorMsg }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Convert simple markdown-like double stars to bold in React rendering
  const renderMessageText = (text: string) => {
    // Basic bold **text** parsing
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      // Line break support
      return part.split("\n").map((line, i) => (
        <span key={`${index}-${i}`}>
          {line}
          {i < part.split("\n").length - 1 && <br />}
        </span>
      ));
    });
  };

  return (
    <div id="global-chat-widget" className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="w-[380px] h-[520px] rounded-2xl flex flex-col mb-4 overflow-hidden border border-white/10"
            style={{
              background: "rgba(10, 15, 30, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    ClearClaim AI
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                  </h3>
                  <p className="text-[10px] text-slate-400">Autonomous Assistant online</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white/5 text-slate-300 border border-white/5 rounded-tl-none"
                    }`}
                  >
                    {renderMessageText(msg.text)}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 text-slate-400 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs flex items-center gap-2">
                    <Loader size={12} className="animate-spin text-indigo-400" />
                    AI is processing your query...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length === 1 && !loading && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-white/5 bg-black/10">
                {QUICK_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(prompt)}
                    className="text-[10px] text-slate-400 hover:text-indigo-300 bg-white/5 border border-white/5 hover:border-indigo-500/30 px-2 py-1 rounded-full transition-all duration-150"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="p-3 border-t border-white/5 flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your claims, policies, care plans..."
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white p-2 rounded-xl transition-all"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-500 transition-all border border-indigo-400/20"
        whileTap={{ scale: 0.92 }}
        layout
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </motion.button>
    </div>
  );
}
