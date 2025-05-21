import Anthropic from "@anthropic-ai/sdk";
import MessageItem from "./MessageItem";
import React from "react";

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

  const isStreaming = streamingResponses.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message, index) => {
        return (
          <React.Fragment key={index}>
            <MessageItem message={message} />
            {index < messages.length - 1 || isStreaming ? (
              <div className="border-b border-gray-300"></div>
            ) : null}
          </React.Fragment>
        );
      })}
      {isStreaming && (
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
