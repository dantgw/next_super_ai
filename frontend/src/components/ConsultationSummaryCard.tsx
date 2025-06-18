/* eslint-disable */
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText } from "lucide-react";

interface ConsultationSummaryCardProps {
  summary: string;
}

const ConsultationSummaryCard: React.FC<ConsultationSummaryCardProps> = ({
  summary,
}) => (
  <div className="mt-6 bg-white rounded-xl shadow-md border p-8 max-w-3xl mx-auto">
    <div className="flex items-center mb-8">
      <FileText className="size-8 mr-2 text-black" />
      <h1 className="text-3xl font-bold text-gray-900">Consultation Summary</h1>
    </div>
    <div className="prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-3xl font-extrabold text-gray-900 mb-4"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-2xl font-bold text-gray-800 mt-6 mb-2"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-xl font-semibold text-gray-700 mt-4 mb-1"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc ml-6 mb-2" {...props} />
          ),
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          p: ({ node, ...props }) => (
            <p className="mb-2 text-gray-900" {...props} />
          ),
        }}
      >
        {summary}
      </ReactMarkdown>
    </div>
  </div>
);

export default ConsultationSummaryCard;
