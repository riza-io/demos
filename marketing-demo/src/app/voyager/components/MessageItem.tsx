"use client";

import Anthropic from "@anthropic-ai/sdk";
import CodeBlock from "./CodeBlock";
import React, { useState } from "react";
import { parse } from "best-effort-json-parser";

interface MessageItemProps {
  message: Anthropic.Messages.MessageParam;
}

const getRoleStyle = (role: string) => {
  switch (role) {
    case "user":
      return "bg-blue-100 text-blue-800";
    case "assistant":
      return "bg-gray-100 text-gray-800";
    case "tool":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const ToolResult = ({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`p-4 rounded-lg ${getRoleStyle("tool")}`}>
      <div className="font-semibold flex justify-between">
        <div>Riza execution result</div>
        <div>
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="mt-2">
          <CodeBlock code={content} language="json" />
        </div>
      )}
    </div>
  );
};

export default function MessageItem({ message }: MessageItemProps) {
  const { role, content } = message;

  const renderMessageContent = (
    messageContent: string | Anthropic.Messages.ContentBlockParam
  ) => {
    if (typeof messageContent === "string") {
      return (
        <div className={`p-4 rounded-lg ${getRoleStyle(role)}`}>
          <div className="font-bold mb-2 capitalize">{role}</div>
          <div className="whitespace-pre-wrap">{messageContent}</div>
        </div>
      );
    }

    if (messageContent.type === "text") {
      return (
        <div className={`p-4 rounded-lg ${getRoleStyle(role)}`}>
          <div className="font-bold mb-2 capitalize">{role}</div>
          <div className="whitespace-pre-wrap">{messageContent.text}</div>
        </div>
      );
    } else if (messageContent.type === "tool_use") {
      if (typeof messageContent.input === "string") {
        const parsedInput = parse(messageContent.input);
        if (parsedInput.code) {
          console.log("parsedInput", parsedInput.code);
          return (
            <div className={`p-4 rounded-lg ${getRoleStyle(role)}`}>
              <div className="font-semibold mb-2">
                Using tool: {messageContent.name}
              </div>
              <CodeBlock code={parsedInput.code} language="typescript" />
            </div>
          );
        }
      }
      return (
        <div className={`p-4 rounded-lg ${getRoleStyle("tool")}`}>
          <div className="font-semibold mb-2">
            Using tool: {messageContent.name}
          </div>
          <div className="mb-2">Input:</div>
          {typeof messageContent.input === "string" ? (
            <div className="whitespace-pre-wrap">{messageContent.input}</div>
          ) : messageContent.name === "execute_function" &&
            (messageContent.input as any)?.code ? (
            <CodeBlock
              code={(messageContent.input as any).code}
              language="typescript"
            />
          ) : (
            <pre className="bg-gray-800 text-white p-3 rounded overflow-auto">
              {JSON.stringify(messageContent.input, null, 2)}
            </pre>
          )}
        </div>
      );
    } else if (messageContent.type === "tool_result") {
      try {
        const output = JSON.parse(messageContent.content as string);
        return <ToolResult content={JSON.stringify(output, null, 2)} />;
      } catch (e) {
        return <div>Unable to render message content</div>;
      }
    }
  };

  return typeof content === "string"
    ? renderMessageContent(content)
    : content.map((contentBlock, index) => (
        <React.Fragment key={index}>
          {renderMessageContent(contentBlock)}
        </React.Fragment>
      ));
}
