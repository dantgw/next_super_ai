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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mic, StopCircle, Loader2 } from "lucide-react";

interface TranscriptionProps {
  className?: string;
}

interface SpeakerSegment {
  id: number;
  speaker: string;
  text: string;
  timestamp: number;
  language?: string;
  translated?: string;
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
  const [sessionId, setSessionId] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  const microphoneStreamRef = useRef<MicrophoneStream | null>(null);
  const transcribeStreamRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const originalScrollAreaRef = useRef<HTMLDivElement>(null);
  const translatedScrollAreaRef = useRef<HTMLDivElement>(null);

  const SAMPLE_RATE = 44100;

  useEffect(() => {
    setSessionId(
      `SESSION_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`
    );
    const timer = setInterval(
      () => setCurrentTime(new Date().toLocaleTimeString()),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to bottom when content updates
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const scrollableViewport = ref.current.querySelector(
        "div[data-radix-scroll-area-viewport]"
      );
      if (scrollableViewport)
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
    }
  };

  useEffect(() => {
    if (originalScrollAreaRef.current && translatedScrollAreaRef.current) {
      scrollToBottom(originalScrollAreaRef);
      scrollToBottom(translatedScrollAreaRef);
    }
  }, [speakerSegments]);

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
                    id: Date.now(),
                    speaker: `Speaker ${(speakerSegments.length % 2) + 1}`, // Alternate between speakers
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

                  // Translate the segment
                  translateText(newTranscript).then((translatedText) => {
                    if (translatedText) {
                      setSpeakerSegments((prev) =>
                        prev.map((seg) =>
                          seg === newSegment
                            ? { ...seg, translated: translatedText }
                            : seg
                        )
                      );
                    }
                  });
                } else {
                  // Single speaker mode
                  const newSegment: SpeakerSegment = {
                    id: Date.now(),
                    speaker: "Speaker",
                    text: newTranscript,
                    timestamp: Date.now(),
                  };

                  setSpeakerSegments((prev) => [...prev, newSegment]);

                  // Translate the segment
                  translateText(newTranscript).then((translatedText) => {
                    if (translatedText) {
                      setSpeakerSegments((prev) =>
                        prev.map((seg) =>
                          seg === newSegment
                            ? { ...seg, translated: translatedText }
                            : seg
                        )
                      );
                    }
                  });
                }

                // Process with Bedrock in background
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

  const translateText = async (text: string): Promise<string | undefined> => {
    try {
      // Only skip translation if both source and target are English
      const isEnglishToEnglish =
        primaryLanguage.startsWith("en") && targetLanguage === "en";
      if (isEnglishToEnglish) return text;

      const translateCommand = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: primaryLanguage.split("-")[0], // e.g., 'en-US' -> 'en'
        TargetLanguageCode: targetLanguage,
      });

      const translatedResult = await translateClient.send(translateCommand);
      return translatedResult.TranslatedText;
    } catch (err) {
      console.error("Translation error:", err);
      return undefined;
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

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b bg-background shadow-sm">
        <h1 className="text-2xl font-semibold text-center text-primary">
          Live Patient Transcript Viewer
        </h1>
      </header>

      {/* Control Bar */}
      <div className="p-3 border-b bg-slate-100 dark:bg-slate-800 flex items-center justify-center space-x-4">
        {!isRecording ? (
          <Button onClick={startRecording} size="lg" disabled={isLoading}>
            <Mic className="mr-2 h-5 w-5" /> Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="lg"
            disabled={isLoading}
          >
            <StopCircle className="mr-2 h-5 w-5" /> Stop Recording
          </Button>
        )}
        {isRecording && (
          <div className="flex items-center text-red-500 animate-pulse">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Recording...</span>
          </div>
        )}
      </div>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
        {/* Original Language Column */}
        <section className="flex flex-col border-r bg-background">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <Label
              htmlFor="primaryLanguage"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Original Language
            </Label>
            <Select
              value={primaryLanguage}
              onValueChange={setPrimaryLanguage}
              disabled={isRecording}
            >
              <SelectTrigger id="primaryLanguage" className="mt-1 w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es-US">Spanish (US)</SelectItem>
                <SelectItem value="fr-FR">French</SelectItem>
                <SelectItem value="de-DE">German</SelectItem>
                <SelectItem value="it-IT">Italian</SelectItem>
                <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                <SelectItem value="ja-JP">Japanese</SelectItem>
                <SelectItem value="ko-KR">Korean</SelectItem>
                <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                <SelectItem value="ar-SA">Arabic</SelectItem>
                <SelectItem value="hi-IN">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 p-4" ref={originalScrollAreaRef}>
            <div className="space-y-3" aria-live="polite">
              {speakerSegments.map((segment) => (
                <div
                  key={segment.id}
                  className="p-2 rounded-md bg-card dark:bg-card shadow-sm"
                >
                  {segment.speaker && (
                    <span className="font-semibold text-sm text-primary mr-2">
                      {segment.speaker}:
                    </span>
                  )}
                  <p className="inline text-slate-800 dark:text-slate-200 leading-relaxed">
                    {segment.text}
                  </p>
                </div>
              ))}
              {!isRecording && speakerSegments.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Press "Start Recording" to begin.
                </p>
              )}
            </div>
          </ScrollArea>
        </section>

        {/* Translated Language Column */}
        <section className="flex flex-col bg-background">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <Label
              htmlFor="targetLanguage"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Translated Language
            </Label>
            <Select
              value={targetLanguage}
              onValueChange={setTargetLanguage}
              disabled={isRecording}
            >
              <SelectTrigger id="targetLanguage" className="mt-1 w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 p-4" ref={translatedScrollAreaRef}>
            <div className="space-y-3" aria-live="polite">
              {speakerSegments.map((segment) => (
                <div
                  key={`trans-${segment.id}`}
                  className="p-2 rounded-md bg-card dark:bg-card shadow-sm"
                >
                  {segment.speaker && (
                    <span className="font-semibold text-sm text-primary mr-2">
                      {segment.speaker}:
                    </span>
                  )}
                  <p className="inline text-slate-800 dark:text-slate-200 leading-relaxed">
                    {segment.translated || "Translation in progress..."}
                  </p>
                </div>
              ))}
              {!isRecording && speakerSegments.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Translation will appear here.
                </p>
              )}
            </div>
          </ScrollArea>
        </section>
      </main>

      <footer className="p-3 border-t text-xs text-center text-muted-foreground bg-background">
        <span>Session ID: {sessionId}</span>
        <Separator
          orientation="vertical"
          className="h-4 inline-block mx-2 bg-slate-300 dark:bg-slate-600"
        />
        <span>Current Time: {currentTime}</span>
      </footer>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center fixed bottom-4 right-4">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

export default Transcription;
