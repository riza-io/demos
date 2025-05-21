"use client";

import Anthropic from "@anthropic-ai/sdk";
import React, { useContext } from "react";
import { ToolUseContext } from "../context";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageItemProps {
  message: Anthropic.Messages.MessageParam;
}

const getRoleStyle = (role: string) => {
  switch (role) {
    case "user":
      return "text-blue-800";
    case "assistant":
      return "text-gray-800";
    case "tool":
      return "bg-green-100 rounded-lg p-4 text-green-800";
    default:
      return "text-gray-800";
  }
};

export default function MessageItem({ message }: MessageItemProps) {
  const { role, content } = message;
  const { setToolUse } = useContext(ToolUseContext);

  const renderMessageContent = (
    messageContent: string | Anthropic.Messages.ContentBlockParam
  ) => {
    if (typeof messageContent === "string") {
      return (
        <div className={`${getRoleStyle(role)}`}>
          <div className="font-bold capitalize">{role}</div>
          <article className="prose !max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{messageContent}</Markdown>
          </article>
        </div>
      );
    }

    if (messageContent.type === "text") {
      return (
        <div className={`${getRoleStyle(role)}`}>
          <div className="font-bold capitalize">{role}</div>
          <article className="prose !max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>
              {messageContent.text}
            </Markdown>
          </article>
        </div>
      );
    } else if (messageContent.type === "tool_use") {
      return (
        <div
          className={`flex flex-row gap-2 justify-between ${getRoleStyle(
            "tool"
          )}`}
        >
          <div className="font-semibold">Using tool: {messageContent.name}</div>
          <button
            onClick={() =>
              setToolUse(
                messageContent.id,
                messageContent.name,
                messageContent.input
              )
            }
          >
            View tool use
          </button>
        </div>
      );
    } else if (messageContent.type === "tool_result") {
      try {
        return (
          <div className={`${getRoleStyle("tool")}`}>
            <div className="flex justify-between">
              <div className="font-semibold">Riza execution result</div>
              <div>
                <button onClick={() => setToolUse(messageContent.tool_use_id)}>
                  View tool result
                </button>
              </div>
            </div>
          </div>
        );
      } catch (e) {
        return <div>Unable to render message content</div>;
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {typeof content === "string"
        ? renderMessageContent(content)
        : content.map((contentBlock, index) => (
            <React.Fragment key={index}>
              {renderMessageContent(contentBlock)}
            </React.Fragment>
          ))}
    </div>
  );
}
