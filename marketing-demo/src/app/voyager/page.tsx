"use client";

import { useState, useRef, useEffect } from "react";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import Header from "./components/Header";
import Anthropic from "@anthropic-ai/sdk";

export default function VoyagerPage() {
  const messagesRef = useRef<Anthropic.Messages.MessageParam[]>([]);
  const [messages, setMessages] = useState<Anthropic.Messages.MessageParam[]>(
    []
  );
  const [streamingMessage, setStreamingMessage] = useState<
    Anthropic.ContentBlock[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleAddMessage = (message: Anthropic.Messages.MessageParam) => {
    messagesRef.current.push(message);
    setMessages((prev) => [...prev, message]);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Send request to API
      const response = await fetch("/api/voyager/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: messagesRef.current,
        }),
      });

      if (!response.body) {
        throw new Error("No response body received");
      }

      // Set up streaming
      const reader = response.body.getReader();

      // Process the streaming response
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

                // let variant: "code" | "text" = "text";
                // if (data.content_block?.type === "text") {
                //   currentContentBlockContent = data.content_block.text;
                // } else if (data.content_block?.type === "tool_use") {
                //   // variant = "code";
                // }

                setStreamingMessage((prev) => {
                  const newStreamingMessage = [...prev];

                  if (!currentContentBlock) {
                    throw new Error("No content block found");
                  }

                  newStreamingMessage.push(currentContentBlock);
                  return newStreamingMessage;
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
                setStreamingMessage((prev) => {
                  const newMsgs = [...prev];

                  const lastMsg = newMsgs[newMsgs.length - 1];

                  if (lastMsg.type === "text") {
                    newMsgs[newMsgs.length - 1] = {
                      ...lastMsg,
                      text: currentContentBlockContent,
                    };
                  } else if (lastMsg.type === "tool_use") {
                    newMsgs[newMsgs.length - 1] = {
                      ...lastMsg,
                      input: currentContentBlockContent,
                    };
                  }

                  return newMsgs;
                });
                break;

              case "message_delta":
                if (data.delta?.stop_reason === "tool_use") {
                  if (!currentMessage) {
                    throw new Error("No message found");
                  }

                  const newMessage: Anthropic.Message = {
                    ...currentMessage,
                    ...data.delta,
                  };

                  currentMessage = newMessage;

                  if (currentContentBlock?.type === "tool_use") {
                    handleToolUse(currentContentBlock);
                  }
                }
                break;

              case "content_block_stop":
                if (currentContentBlock?.type === "tool_use") {
                  currentContentBlock.input = JSON.parse(
                    currentContentBlockContent
                  );

                  setStreamingMessage((prev) => {
                    const newMsgs = [...prev];

                    if (currentContentBlock?.type !== "tool_use") {
                      throw new Error(
                        "Current content block is not a tool use"
                      );
                    }

                    newMsgs[newMsgs.length - 1] = currentContentBlock;

                    return newMsgs;
                  });
                } else if (currentContentBlock?.type === "text") {
                  currentContentBlock.text = currentContentBlockContent;
                } else {
                  throw new Error(
                    `Unsupported content block type: ${currentContentBlock?.type}`
                  );
                }

                if (!currentMessage || !currentContentBlock) {
                  throw new Error("No message or content block found");
                }

                currentMessage.content.push(currentContentBlock);
                break;

              case "message_stop":
                setStreamingMessage([]);

                if (!currentMessage) {
                  throw new Error("No message found");
                }

                handleAddMessage(currentMessage);

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

  const handleToolUse = async (toolUse: Anthropic.Messages.ToolUseBlock) => {
    const toolUseJSON = toolUse.input as Record<string, any>;

    try {
      // Execute the function
      const response = await fetch("/api/voyager/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: toolUseJSON.code,
          input: toolUseJSON.input,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute function");
      }

      const result = await response.json();

      // Add tool result message to chat
      const toolResultMessage: Anthropic.Messages.MessageParam = {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result.output),
          },
        ],
      };

      handleAddMessage(toolResultMessage);
      handleSendMessage();
    } catch (err) {
      console.error("Error executing function:", err);

      // Add error message as tool result
      const errorMessage: Anthropic.Messages.MessageParam = {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            is_error: true,
          },
        ],
      };

      handleAddMessage(errorMessage);
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <Header />

      <div className="flex-1 overflow-auto mb-4 border border-gray-200 rounded-md p-4">
        <MessageList
          messages={messages}
          streamingResponses={streamingMessage}
        />
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <ChatInput
        onSendMessage={(message) => {
          handleAddMessage({
            role: "user",
            content: [{ type: "text", text: message }],
          });
          handleSendMessage();
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
