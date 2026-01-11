"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCommonConfig } from "../../lib/chat-config";
import { Volume2, Loader2 } from "lucide-react"; 

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false); // New state for replay spinner
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // --- ELEVENLABS: HIDDEN AUDIO PLAYER ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const commonConfig = getCommonConfig();

  // --- ELEVENLABS: VOICE FUNCTION ---
  const playVoice = async (text: string) => {
    try {
      setVoiceLoading(true); // Show loading spinner on button

      // 1. Fetch Audio from Backend
      const response = await fetch("/api/speak", {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Voice generation failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 2. Play using the Hidden Audio Element
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = 0.9; // Slow & Clear
        
        await audioRef.current.play().catch((err) => {
           console.error("❌ Browser blocked audio:", err);
        });
      }
    } catch (err) {
      console.error("Audio error:", err);
    } finally {
      setVoiceLoading(false);
    }
  };

  // --- AUTO-SPEAK EFFECT ---
  // When a new AI message arrives, read it automatically
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant") {
      playVoice(lastMsg.content);
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
      // 2. Call YOUR Gemini Route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const answer = await response.text();

      // 3. Add AI Response (Triggers useEffect to speak)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer },
      ]);
      
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
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
        
        {/* --- HIDDEN AUDIO PLAYER --- */}
        <audio ref={audioRef} className="hidden" />

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
                  onClick={() => playVoice(msg.content)} 
                  disabled={voiceLoading}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Read out loud"
                >
                  {voiceLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-gray-500" />
                  )}
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
            className="flex-1 text-lg h-12"
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