interface CodeBlockProps {
  code: string;
  language: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className="relative">
      <pre className="bg-gray-800 text-white p-3 rounded text-xs overflow-auto">
        <code>{code}</code>
      </pre>
      <div className="absolute top-0 right-0 bg-gray-700 text-xs text-white px-2 py-1 rounded-bl">
        {language}
      </div>
    </div>
  );
}
