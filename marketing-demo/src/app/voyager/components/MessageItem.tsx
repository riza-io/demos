import { ChatMessage } from "../types";
import CodeBlock from "./CodeBlock";

interface MessageItemProps {
  message: ChatMessage;
}

export default function MessageItem({ message }: MessageItemProps) {
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

  const renderMessageContent = () => {
    if (message.type === "text") {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    } else if (message.type === "tool_use") {
      return (
        <div>
          <div className="font-semibold mb-2">
            Using tool: {message.tool.name}
          </div>
          <div className="mb-2">Input:</div>
          {message.tool.name === "execute_function" &&
          message.tool.input.code ? (
            <CodeBlock code={message.tool.input.code} language="typescript" />
          ) : (
            <pre className="bg-gray-800 text-white p-3 rounded overflow-auto">
              {JSON.stringify(message.tool.input, null, 2)}
            </pre>
          )}
        </div>
      );
    } else if (message.type === "tool_result") {
      try {
        const output = JSON.parse(message.tool.output);
        return (
          <div>
            <div className="font-semibold mb-2">Tool result:</div>
            <pre className="bg-gray-800 text-white p-3 rounded overflow-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        );
      } catch (e) {
        return (
          <div>
            <div className="font-semibold mb-2">Tool result:</div>
            <div>{message.tool.output}</div>
          </div>
        );
      }
    }
  };

  return (
    <div className={`p-4 rounded-lg ${getRoleStyle(message.role)}`}>
      <div className="font-bold mb-2 capitalize">{message.role}</div>
      {renderMessageContent()}
    </div>
  );
}
