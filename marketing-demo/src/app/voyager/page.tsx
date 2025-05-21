"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, MessageType, ToolUseMessage } from "./types";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import Header from "./components/Header";
import Anthropic from "@anthropic-ai/sdk";

export default function VoyagerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (
    message: string,
    type: "text" | "tool_result" = "text"
  ) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message to chat
    let userMessage: ChatMessage;
    if (type === "text") {
      userMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        type: "text",
        variant: "text",
      };
    } else {
      userMessage = {
        id: Date.now().toString(),
        role: "user",
        type: "tool_result",
        tool: {
          name: "tool_result",
          output: message,
        },
      };
    }

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Create assistant message placeholder
      // const assistantMessageId = (Date.now() + 1).toString();
      // const assistantMessage: ChatMessage = {
      //   id: assistantMessageId,
      //   role: "assistant",
      //   content: "",
      //   type: "text",
      //   variant: "text",
      // };

      // setMessages((prev) => [...prev, assistantMessage]);

      // Send request to API
      const response = await fetch("/api/voyager/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: messages,
          message,
        }),
      });

      if (!response.body) {
        throw new Error("No response body received");
      }

      // Set up streaming
      const reader = response.body.getReader();

      // Process the streaming response
      // let result: { type?: string; toolUse?: any } = {};
      // let currentAssistantMessage = "";
      // let currentToolUse: any = null;
      let isProcessing = true;

      let currentContentBlock: Anthropic.ContentBlock | null = null;
      let currentContentBlockContent: string = "";

      let currentMessage: Anthropic.Message | null = null;

      while (isProcessing) {
        const { done, value } = await reader.read();

        if (done) {
          isProcessing = false;
          break;
        }

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);

        // Split by lines and process each line
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            switch (data.type) {
              case "message_start":
                // Initialize a new message
                currentMessage = data.message as Anthropic.Message;
                break;

              case "content_block_start":
                console.log("starting new content block");

                currentContentBlock = data.content_block;
                currentContentBlockContent = "";

                let variant: "code" | "text" = "text";
                if (data.content_block?.type === "text") {
                  currentContentBlockContent = data.content_block.text;
                } else if (data.content_block?.type === "tool_use") {
                  variant = "code";
                }

                setMessages((prev) => {
                  const newMsgs = [...prev];

                  if (!currentMessage) {
                    throw new Error("No message found");
                  }

                  // treat all messages as text while streaming
                  newMsgs.push({
                    id: currentMessage.id,
                    role: currentMessage.role,
                    content: currentContentBlockContent,
                    type: "text",
                    variant,
                  });

                  return newMsgs;
                });
                break;

              case "content_block_delta":
                if (data.delta?.type === "text_delta") {
                  // Append text to the current message
                  currentContentBlockContent += data.delta.text;
                } else if (data.delta?.type === "input_json_delta") {
                  currentContentBlockContent += data.delta.partial_json;
                }

                // Cause a re-render
                setMessages((prev) => {
                  const newMsgs = [...prev];

                  const lastMsg = newMsgs[newMsgs.length - 1];
                  if (lastMsg.type !== "text") {
                    throw new Error("Last message is not a text message");
                  }

                  newMsgs[newMsgs.length - 1] = {
                    ...lastMsg,
                    content: currentContentBlockContent,
                  };

                  return newMsgs;
                });
                break;

              case "message_delta":
                if (data.delta?.stop_reason === "tool_use") {
                  // tool use json is the last message content
                  const toolUseJSON = JSON.parse(currentContentBlockContent);

                  setMessages((prev) => {
                    const newMsgs = [...prev];

                    if (!currentMessage) {
                      throw new Error("No message found");
                    }

                    if (currentContentBlock?.type !== "tool_use") {
                      throw new Error(
                        "Current content block is not a tool use"
                      );
                    }

                    const toolUseMessage: ToolUseMessage = {
                      id: currentMessage.id,
                      role: currentMessage.role,
                      type: "tool_use",
                      tool: {
                        id: currentContentBlock.id,
                        name: currentContentBlock.name,
                        input: toolUseJSON,
                      },
                    };

                    newMsgs.push(toolUseMessage);
                    return newMsgs;
                  });

                  if (currentContentBlock?.type === "tool_use") {
                    handleToolUse({
                      id: currentContentBlock.id,
                      name: currentContentBlock.name,
                      input: toolUseJSON,
                    });
                  }
                }
                break;

              case "message_stop":
                isProcessing = false;
                break;
            }
          } catch (error) {
            console.error("Error parsing streaming response:", error);
          }
        }
      }

      // Handle tool use if returned from the streaming handler
      // if (result?.type === "tool_use" && result.toolUse) {
      //   await handleToolUse(result.toolUse);
      // }

      // TODO: handle tool use
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolUse = async (toolUse: {
    id: string;
    name: string;
    input: Record<string, any>;
  }) => {
    console.log("handleToolUse", toolUse);
    try {
      // Add tool use message to chat
      const toolUseMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        type: "tool_use",
        tool: {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        },
      };

      setMessages((prev) => [...prev, toolUseMessage]);

      // Execute the function
      const response = await fetch("/api/voyager/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: toolUse.input.code,
          input: toolUse.input.input,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute function");
      }

      const result = await response.json();

      // Add tool result message to chat
      const toolResultMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "tool",
        type: "tool_result",
        tool: {
          name: toolUse.id,
          output: JSON.stringify(result.output),
        },
      };

      setMessages((prev) => [...prev, toolResultMessage]);

      handleSendMessage(toolResultMessage.tool.output, "tool_result");
    } catch (err) {
      console.error("Error executing function:", err);

      // Add error message as tool result
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "tool",
        type: "tool_result",
        tool: {
          name: toolUse.id,
          output: JSON.stringify({
            error: err instanceof Error ? err.message : "Unknown error",
          }),
        },
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <Header />

      <div className="flex-1 overflow-auto mb-4 border border-gray-200 rounded-md p-4">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
