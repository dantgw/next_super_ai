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

interface SpeakerSegment {
  speaker: string;
  text: string;
  timestamp: number;
  language?: string;
}

export const Transcription: React.FC<TranscriptionProps> = ({ className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translatedText, setTranslatedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [speakerSegments, setSpeakerSegments] = useState<SpeakerSegment[]>([]);
  const [enableSpeakerIdentification, setEnableSpeakerIdentification] =
    useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState("en-US");

  const microphoneStreamRef = useRef<MicrophoneStream | null>(null);
  const transcribeStreamRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLDivElement>(null);
  const speakerSegmentsRef = useRef<HTMLDivElement>(null);

  const SAMPLE_RATE = 44100;

  // Auto-scroll to bottom when content updates
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  };

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

  // Start streaming transcription with speaker identification
  const startStreaming = async (callback: (text: string) => void) => {
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: primaryLanguage as any,
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
              const result = results[0];
              const newTranscript = result.Alternatives?.[0]?.Transcript;

              if (newTranscript) {
                console.log("New transcript:", newTranscript);

                // For now, we'll use a simple approach to detect speaker changes
                // based on pauses and text patterns
                if (enableSpeakerIdentification) {
                  const newSegment: SpeakerSegment = {
                    speaker: `Speaker ${speakerSegments.length + 1}`, // Simple speaker numbering
                    text: newTranscript,
                    timestamp: Date.now(),
                  };

                  setSpeakerSegments((prev) => [...prev, newSegment]);

                  // Try to detect language for this segment
                  detectLanguage(newTranscript).then((language) => {
                    if (language && language !== primaryLanguage) {
                      setSpeakerSegments((prev) =>
                        prev.map((seg) =>
                          seg === newSegment ? { ...seg, language } : seg
                        )
                      );
                    }
                  });
                } else {
                  // Fallback to single speaker mode
                  callback(newTranscript + " ");
                }

                // Process async operations without blocking the stream
                translateText(newTranscript).catch(console.error);
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

  // Detect language for a text segment
  const detectLanguage = async (text: string): Promise<string | null> => {
    try {
      // For now, we'll use a simple heuristic approach
      // In a production app, you might want to use AWS Comprehend for language detection
      const nonLatinPattern = /[^\u0000-\u007F]/;
      if (nonLatinPattern.test(text)) {
        // This is a very basic heuristic - you'd want more sophisticated detection
        return "auto";
      }
      return null;
    } catch (error) {
      console.error("Language detection error:", error);
      return null;
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

      // Clear previous segments
      setSpeakerSegments([]);

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
      // Only skip translation if both source and target are English
      const isEnglishToEnglish =
        primaryLanguage.startsWith("en") && targetLanguage === "en";
      if (isEnglishToEnglish) return;

      const translateCommand = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: primaryLanguage.split("-")[0], // e.g., 'en-US' -> 'en'
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
    setSpeakerSegments([]);
    setError(null);
    setDebugInfo("");
  };

  // Auto-scroll effects
  useEffect(() => {
    scrollToBottom(transcriptionRef);
  }, [transcription]);

  useEffect(() => {
    scrollToBottom(translationRef);
  }, [translatedText]);

  useEffect(() => {
    scrollToBottom(speakerSegmentsRef);
  }, [speakerSegments]);

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
    <div className={`p-6 max-w-6xl mx-auto ${className}`}>
      {/* Header with improved layout */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Real-Time Transcription & Translation
        </h2>

        {/* Language settings in a grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <label
              htmlFor="primaryLanguage"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Primary Language (for transcription)
            </label>
            <select
              id="primaryLanguage"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={primaryLanguage}
              onChange={(e) => setPrimaryLanguage(e.target.value)}
            >
              <option value="en-US">English (US)</option>
              <option value="es-US">Spanish (US)</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="it-IT">Italian</option>
              <option value="pt-BR">Portuguese (Brazil)</option>
              <option value="ja-JP">Japanese</option>
              <option value="ko-KR">Korean</option>
              <option value="zh-CN">Chinese (Simplified)</option>
              <option value="ar-SA">Arabic</option>
              <option value="hi-IN">Hindi</option>
            </select>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <label
              htmlFor="language"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Target Language (for translation)
            </label>
            <select
              id="language"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
        </div>

        {/* Speaker identification toggle */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="speakerIdentification"
              checked={enableSpeakerIdentification}
              onChange={(e) => setEnableSpeakerIdentification(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label
              htmlFor="speakerIdentification"
              className="text-sm font-medium text-gray-700"
            >
              Enable Speaker Identification (for multiple speakers)
            </label>
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
          className={`flex-1 py-4 px-8 rounded-xl text-white font-semibold text-lg transition-all duration-200 ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : isRecording
              ? "bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-xl"
              : "bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl"
          }`}
        >
          {isLoading
            ? "Loading..."
            : isRecording
            ? "⏹️ Stop Recording"
            : "🎤 Start Recording"}
        </button>

        <button
          onClick={clearTranscription}
          disabled={isLoading || isRecording}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
            isLoading || isRecording
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl"
          }`}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full mr-3 animate-pulse"></div>
          <span className="font-medium">Recording in progress...</span>
        </div>
      )}

      {/* Debug Info */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-700">
        <strong>Debug Info:</strong> {debugInfo}
      </div>

      {/* Main content area with side-by-side layout */}
      <div className="space-y-6">
        {/* Speaker Segments Display */}
        {enableSpeakerIdentification && speakerSegments.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
              <span className="mr-2">👥</span>
              Speaker Segments
            </h3>
            <div
              ref={speakerSegmentsRef}
              className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {speakerSegments.map((segment, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 bg-white p-3 rounded-lg shadow-sm"
                >
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                    {segment.speaker}
                  </span>
                  <div className="flex-1">
                    <span className="text-gray-800">{segment.text}</span>
                    {segment.language &&
                      segment.language !== primaryLanguage && (
                        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          detected: {segment.language}
                        </span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcription and Translation side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Transcription */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📝</span>
              Original Transcription
            </h3>
            <div
              ref={transcriptionRef}
              className="bg-gray-50 p-4 rounded-lg h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {transcription || "No transcription yet..."}
              </p>
            </div>
          </div>

          {/* Translation */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🌐</span>
              Translation
              {targetLanguage !== "en" && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (
                  {
                    supportedLanguages.find((l) => l.code === targetLanguage)
                      ?.name
                  }
                  )
                </span>
              )}
            </h3>
            <div
              ref={translationRef}
              className="bg-gray-50 p-4 rounded-lg h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {translatedText
                  ? translatedText
                  : primaryLanguage.startsWith("en") && targetLanguage === "en"
                  ? "Translation disabled (English to English)"
                  : "No translation yet..."}
              </p>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transcription;
