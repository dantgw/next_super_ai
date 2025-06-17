"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  transcribeClient,
  translateClient,
  bedrockClient,
  supportedLanguages,
} from "../config/aws-config";
import {
  StartStreamTranscriptionCommand,
  TranscriptEvent,
} from "@aws-sdk/client-transcribe-streaming";
import { TranslateTextCommand } from "@aws-sdk/client-translate";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import MicrophoneStream from "microphone-stream";
import { Buffer } from "buffer";

interface TranscriptionProps {
  className?: string;
}

export const Transcription: React.FC<TranscriptionProps> = ({ className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translatedText, setTranslatedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const microphoneStreamRef = useRef<MicrophoneStream | null>(null);
  const transcribeStreamRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const SAMPLE_RATE = 44100;
  const language = "en-US";

  // Encode PCM chunk for AWS Transcribe
  const encodePCMChunk = (chunk: any) => {
    const input = MicrophoneStream.toRaw(chunk);
    let offset = 0;
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return Buffer.from(buffer);
  };

  // Create audio stream generator for AWS Transcribe
  const getAudioStream = async function* () {
    if (!microphoneStreamRef.current) return;

    for await (const chunk of microphoneStreamRef.current as any) {
      if (chunk.length <= SAMPLE_RATE) {
        yield {
          AudioEvent: {
            AudioChunk: encodePCMChunk(chunk),
          },
        };
      }
    }
  };

  // Start streaming transcription
  const startStreaming = async (callback: (text: string) => void) => {
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: language,
      MediaEncoding: "pcm",
      MediaSampleRateHertz: SAMPLE_RATE,
      AudioStream: getAudioStream(),
    });

    const data = await transcribeClient.send(command);
    transcribeStreamRef.current = data;

    if (data.TranscriptResultStream) {
      // Use a separate async function to handle the stream without blocking
      const processStream = async () => {
        try {
          for await (const event of data.TranscriptResultStream!) {
            const results = event.TranscriptEvent?.Transcript?.Results;
            if (results && results.length && !results[0]?.IsPartial) {
              const newTranscript = results[0].Alternatives?.[0]?.Transcript;
              if (newTranscript) {
                console.log("New transcript:", newTranscript);
                callback(newTranscript + " ");

                // Process async operations without blocking the stream
                if (targetLanguage !== "en") {
                  translateText(newTranscript).catch(console.error);
                }
                processWithBedrock(newTranscript).catch(console.error);
              }
            }
          }
        } catch (error) {
          console.error("Stream processing error:", error);
          if (isRecording) {
            setError("Transcription stream error. Please try again.");
            setIsRecording(false);
          }
        }
      };

      // Start processing the stream in the background
      processStream();
    }
  };

  // Create microphone stream
  const createMicrophoneStream = async () => {
    microphoneStreamRef.current = new MicrophoneStream();
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;
    microphoneStreamRef.current.setStream(stream);
  };

  const startRecording = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setDebugInfo("Starting recording...");
      console.log("Starting recording process...");

      // Stop any existing recording first
      if (microphoneStreamRef.current || transcribeStreamRef.current) {
        stopRecording();
      }

      // Create microphone stream
      await createMicrophoneStream();
      setDebugInfo("Microphone stream created, starting transcription...");

      // Start transcription streaming (non-blocking)
      startStreaming((text) => {
        setTranscription((prev) => prev + text);
        setDebugInfo(`Transcription: ${text}`);
      });

      // Set recording state after successful setup
      setIsRecording(true);
      setIsLoading(false);
      setDebugInfo("Recording started successfully");
      console.log("Recording started successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
      setIsRecording(false);
      setIsLoading(false);
      console.error("Recording error:", err);
    }
  };

  const translateText = async (text: string) => {
    try {
      const translateCommand = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: "en",
        TargetLanguageCode: targetLanguage,
      });

      const translatedResult = await translateClient.send(translateCommand);
      if (translatedResult.TranslatedText) {
        setTranslatedText(
          (prev) => prev + " " + translatedResult.TranslatedText
        );
      }
    } catch (err) {
      console.error("Translation error:", err);
    }
  };

  const processWithBedrock = async (text: string) => {
    try {
      const bedrockCommand = new InvokeModelCommand({
        modelId: "anthropic.claude-v2",
        body: JSON.stringify({
          prompt: `\n\nHuman: Please analyze this medical transcription and provide any relevant medical context or corrections: "${text}"\n\nAssistant:`,
          max_tokens_to_sample: 500,
          temperature: 0.7,
        }),
        contentType: "application/json",
      });

      const llmResponse = await bedrockClient.send(bedrockCommand);
      console.log("LLM response:", llmResponse);
    } catch (err) {
      console.error("Bedrock error:", err);
    }
  };

  const stopRecording = () => {
    try {
      console.log("Stopping recording...");
      setDebugInfo("Stopping recording...");
      setIsLoading(true);

      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.stop();
        microphoneStreamRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (transcribeStreamRef.current) {
        transcribeStreamRef.current.TranscriptResultStream?.destroy?.();
        transcribeStreamRef.current = null;
      }

      setIsRecording(false);
      setIsLoading(false);
      setDebugInfo("Recording stopped");
      console.log("Recording stopped successfully");
    } catch (err) {
      console.error("Error stopping recording:", err);
      setDebugInfo(`Error stopping: ${err}`);
      setIsLoading(false);
    }
  };

  const clearTranscription = () => {
    setTranscription("");
    setTranslatedText("");
    setError(null);
    setDebugInfo("");
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={`p-6 max-w-4xl mx-auto ${className}`}>
      <div className="mb-6">
        <label htmlFor="language" className="block text-sm font-medium mb-2">
          Target Language
        </label>
        <select
          id="language"
          className="w-full p-2 border rounded-md"
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
          className={`flex-1 py-3 px-6 rounded-full text-white font-medium ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isLoading
            ? "Loading..."
            : isRecording
            ? "Stop Recording"
            : "Start Recording"}
        </button>

        <button
          onClick={clearTranscription}
          disabled={isLoading || isRecording}
          className={`px-6 py-3 rounded-full font-medium ${
            isLoading || isRecording
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gray-500 hover:bg-gray-600 text-white"
          }`}
        >
          Clear
        </button>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
          Recording in progress...
        </div>
      )}

      {/* Debug Info */}
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <strong>Debug Info:</strong> {debugInfo}
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Original Transcription:</h3>
          <p className="whitespace-pre-wrap">
            {transcription || "No transcription yet..."}
          </p>
        </div>

        {targetLanguage !== "en" && translatedText && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Translation:</h3>
            <p className="whitespace-pre-wrap">{translatedText}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}
      </div>
    </div>
  );
};

export default Transcription;
