"use client";

import { useState } from "react";
import customers from "@/examples/customers.json";

export default function TransformPage() {
  const [inputData, setInputData] = useState(JSON.stringify(customers));
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<string>(
    JSON.stringify(["name", "email_address", "address", "age"])
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Parse the input as JSON
      const dataArray = JSON.parse(inputData);
      const schemaArray = JSON.parse(schema);

      const response = await fetch("/api/transform-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: dataArray,
          schema: schemaArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to transform data");
      }

      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="container"
      style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}
    >
      <h1>Transform Data</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="inputData"
            style={{ display: "block", marginBottom: "8px" }}
          >
            Input JSON Array:
          </label>
          <textarea
            id="inputData"
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            rows={10}
            style={{
              width: "100%",
              padding: "8px",
              fontFamily: "monospace",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
            placeholder='[{"name": "John", "age": 30}, {"name": "Jane", "email": "jane@example.com"}]'
          />
          <label
            htmlFor="schema"
            style={{ display: "block", marginBottom: "8px" }}
          >
            Schema
          </label>
          <textarea
            id="schema"
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              fontFamily: "monospace",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "10px 20px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Processing..." : "Transform Data"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: "#ffeeee",
            color: "#d32f2f",
            borderRadius: "4px",
          }}
        >
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h2>Result:</h2>
          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "4px",
              overflow: "auto",
              maxHeight: "400px",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
