import React, { useEffect, useRef } from "react";
import { Highlight, themes } from "prism-react-renderer";

type CodeDisplayProps = {
  language: string;
  className?: string;
  code: string;
  size?: "small" | "medium";
  /** If true + used with a maxHeight, will pin scroll to bottom of div */
  streaming?: boolean;
  maxHeight?: string;
};

const CodeDisplay: React.FC<CodeDisplayProps> = ({
  language,
  code,
  size = "small",
  streaming = false,
  maxHeight,
  className = "",
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // if streaming, scroll to bottom of div whenever value changes
    if (streaming && divRef.current) {
      divRef.current.scrollTop = divRef.current.scrollHeight;
    }
  }, [code]);

  return (
    <div
      className={`grid overflow-auto font-mono ${
        size === "small" ? "text-xs" : "text-sm"
      } ${className}`}
      style={{ gridTemplateColumns: "auto 1fr", maxHeight }}
      ref={divRef}
    >
      <Highlight
        theme={themes.vsLight}
        code={code}
        language={language.toLowerCase()}
      >
        {({ tokens, getLineProps, getTokenProps }) => {
          const rendered = tokens.map((line, i) => (
            <React.Fragment key={i}>
              <div {...getLineProps({ line })} style={{ textAlign: "right" }}>
                <div className="text-gray-400 select-none mr-2 opacity-50">
                  {i + 1}
                </div>
              </div>
              <pre {...getLineProps({ line })} style={{ margin: "0" }}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </pre>
            </React.Fragment>
          ));
          return <React.Fragment>{rendered}</React.Fragment>;
        }}
      </Highlight>
    </div>
  );
};

export default CodeDisplay;
