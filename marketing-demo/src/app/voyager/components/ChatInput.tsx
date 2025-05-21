import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
}: ChatInputProps) {
  const [message, setMessage] = useState("show me my stripe customers");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex border-t border-gray-300">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask me to do something..."
        className="flex-1 p-4 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading || !message.trim()}
        className="px-4 py-2"
      >
        {isLoading ? "Thinking..." : "Send"}
      </button>
    </form>
  );
}
