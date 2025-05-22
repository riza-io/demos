"use client";

import { useState, useRef, useEffect, createContext, useMemo } from "react";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import Anthropic from "@anthropic-ai/sdk";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ToolUseContext } from "./context";
import CodeDisplay from "./components/CodeBlock";
import CodeBlock from "./components/CodeBlock";
import { parse as bestEffortParse } from "best-effort-json-parser";

const renderToolUse = (toolName: string, toolInput: unknown) => {
  if (
    typeof toolInput === "object" &&
    toolInput !== null &&
    "code" in toolInput &&
    typeof toolInput.code === "string"
  ) {
    return (
      <CodeDisplay
        code={toolInput.code}
        language="typescript"
        className="p-4"
      />
    );
  }

  return null;

  // return JSON.stringify(toolInput, null, 2);
};

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
  const [toolUse, setToolUse] = useState<{
    id: string;
    toolName?: string;
    toolInput?: unknown;
    toolInputPartialJson?: string;
  } | null>(null);

  const handleAddMessage = (message: Anthropic.Messages.MessageParam) => {
    messagesRef.current.push(message);
    setMessages((prev) => [...prev, message]);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  }, [messages, streamingMessage[streamingMessage.length - 1]]);

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
                currentContentBlock = data.content_block;
                currentContentBlockContent = "";

                setStreamingMessage((prev) => {
                  const newStreamingMessage = [...prev];

                  if (!currentContentBlock) {
                    throw new Error("No content block found");
                  }

                  newStreamingMessage.push(currentContentBlock);
                  return newStreamingMessage;
                });

                if (data.content_block.type === "tool_use") {
                  setToolUse({
                    id: data.content_block.id,
                    toolName: data.content_block.name,
                    toolInput: {},
                  });
                }
                break;

              case "content_block_delta":
                if (data.delta?.type === "text_delta") {
                  // Append text to the current message
                  currentContentBlockContent += data.delta.text;
                } else if (data.delta?.type === "input_json_delta") {
                  currentContentBlockContent += data.delta.partial_json;
                }

                setToolUse((prev) => {
                  if (
                    !currentContentBlock ||
                    currentContentBlock.type !== "tool_use"
                  ) {
                    return prev;
                  }
                  return {
                    id: currentContentBlock.id,
                    toolName: currentContentBlock.name,
                    toolInput: null,
                    toolInputPartialJson: currentContentBlockContent,
                  };
                });

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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (toolUse?.toolInputPartialJson) {
      const parsed = bestEffortParse(toolUse.toolInputPartialJson);
      setToolUse((prev) => {
        if (!prev) {
          return prev;
        }
        return { ...prev, toolInput: parsed };
      });
    }
  }, [toolUse?.toolInputPartialJson]);

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

  const clearToolUse = () => {
    setToolUse(null);
  };

  const handleSetToolUse = (
    id: string,
    toolName?: string,
    toolInput?: unknown
  ) => {
    if (toolName && toolInput) {
      setToolUse({ id, toolName, toolInput });
    } else {
      setToolUse({ id });
    }
  };

  const visibleToolUse = useMemo(() => {
    if (!toolUse) {
      return undefined;
    }

    if (toolUse.toolName) {
      return {
        id: toolUse.id,
        toolName: toolUse.toolName,
        toolInput: toolUse.toolInput,
      };
    }

    const toolUseMessage = messagesRef.current.find(
      (message) =>
        Array.isArray(message.content) &&
        message.content.find(
          (content) => content.type === "tool_use" && content.id === toolUse.id
        )
    );

    if (!toolUseMessage) {
      return undefined;
    }

    const toolUseContent = Array.isArray(toolUseMessage.content)
      ? toolUseMessage.content.find((content) => content.type === "tool_use")
      : null;

    if (!toolUseContent) {
      return undefined;
    }

    return {
      id: toolUseContent.id,
      toolName: toolUseContent.name,
      toolInput: toolUseContent.input,
    };
  }, [toolUse, streamingMessage, messages]);

  const visibleToolResult = useMemo(() => {
    if (!toolUse) {
      return undefined;
    }

    const toolResultMessage = messagesRef.current.find(
      (message) =>
        Array.isArray(message.content) &&
        message.content.find(
          (content) =>
            content.type === "tool_result" && content.tool_use_id === toolUse.id
        )
    );

    if (toolResultMessage) {
      const toolResultContent = Array.isArray(toolResultMessage.content)
        ? toolResultMessage.content.find(
            (content) => content.type === "tool_result"
          )
        : null;

      if (!toolResultContent) {
        return undefined;
      }

      try {
        const output = JSON.parse(toolResultContent.content as string);
        return JSON.stringify(output, null, 2);
      } catch (e) {
        return toolResultContent.content as string;
      }
    }
  }, [toolUse, messages]);

  return (
    <ToolUseContext.Provider
      value={{
        toolUse,
        setToolUse: handleSetToolUse,
        clearToolUse,
      }}
    >
      <div className="flex flex-col w-full h-screen">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={70}>
            <div className="flex-1 overflow-auto p-4 pb-0 flex flex-col gap-4 h-full">
              <MessageList
                messages={messages}
                streamingResponses={streamingMessage}
              />
              <div ref={messagesEndRef} />
            </div>
          </Panel>
          {visibleToolUse ? (
            <>
              <PanelResizeHandle />
              <Panel defaultSize={30} className="border-l border-gray-300">
                <PanelGroup direction="vertical">
                  <Panel defaultSize={60}>
                    <div className="overflow-auto flex flex-col h-full">
                      <div className="flex flex-row gap-2 justify-between px-4 py-2 border-b border-gray-300">
                        <div className="font-bold">
                          Using tool: {visibleToolUse.toolName}
                        </div>
                        <button onClick={() => clearToolUse()}>Close</button>
                      </div>
                      {renderToolUse(
                        visibleToolUse.toolName,
                        visibleToolUse.toolInput
                      )}
                    </div>
                  </Panel>
                  {visibleToolResult ? (
                    <>
                      <PanelResizeHandle />
                      <Panel
                        defaultSize={40}
                        className="flex flex-col border-t border-gray-300"
                      >
                        <div className="flex flex-row gap-2 justify-between px-4 py-2 border-b border-gray-300">
                          <div className="font-bold">
                            Tool result: {visibleToolUse.toolName}
                          </div>
                        </div>
                        <CodeBlock
                          code={visibleToolResult}
                          language="json"
                          className="p-4 overflow-auto h-full"
                        />
                      </Panel>
                    </>
                  ) : null}
                </PanelGroup>
              </Panel>
            </>
          ) : null}
        </PanelGroup>

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
    </ToolUseContext.Provider>
  );
}
