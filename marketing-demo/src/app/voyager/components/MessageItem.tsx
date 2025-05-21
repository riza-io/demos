import Anthropic from "@anthropic-ai/sdk";
import CodeBlock from "./CodeBlock";
import React from "react";

interface MessageItemProps {
  message: Anthropic.Messages.MessageParam;
}

export default function MessageItem({ message }: MessageItemProps) {
  const { role, content } = message;

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

  const renderMessageContent = (
    messageContent: string | Anthropic.Messages.ContentBlockParam
  ) => {
    if (typeof messageContent === "string") {
      return <div className="whitespace-pre-wrap">{messageContent}</div>;
    }

    if (messageContent.type === "text") {
      return <div className="whitespace-pre-wrap">{messageContent.text}</div>;
    } else if (messageContent.type === "tool_use") {
      return (
        <div>
          <div className="font-semibold mb-2">
            Using tool: {messageContent.name}
          </div>
          <div className="mb-2">Input:</div>
          {typeof messageContent.input === "string" ? (
            <div className="whitespace-pre-wrap">{messageContent.input}</div>
          ) : messageContent.name === "execute_function" &&
            (messageContent.input?.code as any) ? (
            <CodeBlock
              code={messageContent.input?.code as any}
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
        return (
          <div>
            <div className="font-semibold mb-2">Tool result:</div>
            <pre className="bg-gray-800 text-white p-3 rounded overflow-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        );
      } catch (e) {
        return <div>Unable to render message content</div>;
      }
    }
  };

  return (
    <div className={`p-4 rounded-lg ${getRoleStyle(role)}`}>
      <div className="font-bold mb-2 capitalize">{role}</div>
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
