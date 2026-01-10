"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// We don't need fetchAnswer anymore because we are calling our own API
// import { fetchAnswer } from "../../lib/answer"; 
import { getCommonConfig } from "../../lib/chat-config";
import { Volume2 } from "lucide-react"; // Import speaker icon

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const commonConfig = getCommonConfig();

  // --- TEXT TO SPEECH FUNCTION ---
  const speak = (text: string) => {
    window.speechSynthesis.cancel(); // Stop previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for seniors
    window.speechSynthesis.speak(utterance);
  };

  // --- AUTO-SPEAK EFFECT ---
  // When a new message arrives from AI, read it automatically
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant") {
      speak(lastMsg.content);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // 1. Add User Message
    const newHistory = [...messages, { role: "user", content: input } as Message];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // 2. Call YOUR Gemini Route (Bypassing the boilerplate default)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const answer = await response.text();

      // 3. Add AI Response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer },
      ]);
      
      // (The useEffect above will handle the speaking automatically)

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      // Keep focus on input for easy typing
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      handleSend();
    }
  };

  return (
    <Card className="max-w-lg w-full mx-auto mt-8 bg-card text-card-foreground border-radius-lg shadow-lg">
      <CardContent className="flex flex-col gap-4 p-4">
        
        {/* CHAT AREA */}
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto bg-background p-2">
          {messages.length === 0 && (
            <div className="text-muted-foreground bg-background text-center py-8">
              {commonConfig.branding.subtitle || "Hello Joe. I am Anchor."}
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              
              {/* AI Avatar */}
              {msg.role === "assistant" && (
                <Avatar className="h-8 w-8"><AvatarFallback>AI</AvatarFallback></Avatar>
              )}

              {/* Message Bubble */}
              <div className={`rounded-lg px-3 py-2 text-xl ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {msg.content}
              </div>

              {/* Replay Button (Only for AI messages) */}
              {msg.role === "assistant" && (
                <button 
                  onClick={() => speak(msg.content)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  aria-label="Read out loud"
                >
                  <Volume2 className="h-4 w-4 text-gray-500" />
                </button>
              )}

              {/* User Avatar */}
              {msg.role === "user" && (
                <Avatar className="h-8 w-8"><AvatarFallback>U</AvatarFallback></Avatar>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-center text-muted-foreground text-sm">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="flex gap-2 pt-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Anchor..."
            disabled={loading}
            className="flex-1 text-lg h-12" // Bigger text for seniors
            autoFocus
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} className="h-12 px-6">
            Send
          </Button>
        </div>
        
        {error && <div className="text-destructive text-xs text-center">{error}</div>}
      </CardContent>
    </Card>
  );
}