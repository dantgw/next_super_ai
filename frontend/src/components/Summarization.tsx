"use client";
import React, { useState } from "react";
import { bedrockClient } from "../config/aws-config";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

interface SummarizationProps {
  className?: string;
}

export const Summarization: React.FC<SummarizationProps> = ({ className }) => {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryLength, setSummaryLength] = useState("medium"); // short, medium, long

  const generateSummary = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to summarize.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary("");

    try {
      // Determine max tokens based on summary length preference
      let maxTokens = 300; // medium
      if (summaryLength === "short") maxTokens = 150;
      if (summaryLength === "long") maxTokens = 500;

      const prompt = `Please provide a ${summaryLength} summary of the following text. Focus on the key points and main ideas:

Text to summarize:
${inputText}

Summary:`;

      const bedrockCommand = new InvokeModelCommand({
        modelId: "us.meta.llama4-maverick-17b-instruct-v1:0",
        body: JSON.stringify({
          prompt: prompt,
          max_gen_len: maxTokens,
          temperature: 0.3, // Lower temperature for more focused summaries
        }),
        contentType: "application/json",
      });

      const response = await bedrockClient.send(bedrockCommand);

      if (response.body) {
        const responseText = new TextDecoder().decode(response.body);
        const parsedResponse = JSON.parse(responseText);
        setSummary(parsedResponse.generation || "No summary generated.");
      } else {
        setError("No response received from the model.");
      }
    } catch (err) {
      console.error("Bedrock error:", err);
      setError(
        "Failed to generate summary. Please check your AWS credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setInputText("");
    setSummary("");
    setError(null);
  };

  return (
    <div className={`p-6 max-w-6xl mx-auto ${className} text-black`}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          AI-Powered Text Summarization
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Enter your text below and get an intelligent summary powered by AWS
          Bedrock
        </p>
      </div>

      {/* Summary Length Selection */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Summary Length
        </label>
        <div className="flex gap-4">
          {[
            { value: "short", label: "Short", desc: "~150 words" },
            { value: "medium", label: "Medium", desc: "~300 words" },
            { value: "long", label: "Long", desc: "~500 words" },
          ].map((option) => (
            <label key={option.value} className="flex items-center space-x-2">
              <input
                type="radio"
                name="summaryLength"
                value={option.value}
                checked={summaryLength === option.value}
                onChange={(e) => setSummaryLength(e.target.value)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">
                {option.label}
              </span>
              <span className="text-xs text-gray-500">({option.desc})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <label
          htmlFor="inputText"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Text to Summarize
        </label>
        <textarea
          id="inputText"
          rows={8}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
          placeholder="Enter or paste your text here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
        />
        <div className="mt-2 text-sm text-gray-500">
          {inputText.length} characters
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={generateSummary}
          disabled={isLoading || !inputText.trim()}
          className={`flex-1 py-4 px-8 rounded-xl text-white font-semibold text-lg transition-all duration-200 ${
            isLoading || !inputText.trim()
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating Summary...
            </span>
          ) : (
            "📝 Generate Summary"
          )}
        </button>

        <button
          onClick={clearAll}
          disabled={isLoading}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
            isLoading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl"
          }`}
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Summary Output */}
      {summary && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Generated Summary
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Summary length: {summary.split(" ").length} words
          </div>
        </div>
      )}
    </div>
  );
};
