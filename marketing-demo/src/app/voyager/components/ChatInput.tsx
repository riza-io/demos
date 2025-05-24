import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  isPinned,
  setIsPinned,
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
    <form
      onSubmit={handleSubmit}
      className="flex border-t border-gray-300 items-center"
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask me to do something..."
        className="flex-1 p-4 focus:outline-none"
      />
      <div>
        <button onClick={() => setIsPinned(!isPinned)} type="button">
          {isPinned ? "Unpin scroll" : "Pin scroll"}
        </button>
      </div>
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
