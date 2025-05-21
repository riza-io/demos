import Anthropic from "@anthropic-ai/sdk";
import MessageItem from "./MessageItem";

interface MessageListProps {
  messages: Anthropic.Messages.MessageParam[];
  streamingResponses: Anthropic.Messages.ContentBlock[];
}

export default function MessageList({
  messages,
  streamingResponses,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Send a message to start the conversation</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        return <MessageItem key={index} message={message} />;
      })}
      {streamingResponses.length > 0 && (
        <>
          <MessageItem
            key={messages.length}
            message={{ role: "assistant", content: streamingResponses }}
          />
        </>
      )}
    </div>
  );
}
