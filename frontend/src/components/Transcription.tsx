"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  transcribeClient,
  translateClient,
  bedrockClient,
  transcribeLanguages,
  translateLanguages,
  speakerLabels,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mic, StopCircle, Loader2, FileText } from "lucide-react";

interface TranscriptionProps {
  className?: string;
}

interface SpeakerSegment {
  id: number;
  speaker: "Doctor" | "Patient";
  text: string;
  timestamp: number;
  language?: string;
  side: "left" | "right";
}

// Add type for supported language codes
type SupportedLanguageCode = keyof typeof speakerLabels;

export const Transcription: React.FC<TranscriptionProps> = ({ className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("zh-CN");
  const [translatedText, setTranslatedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [speakerSegments, setSpeakerSegments] = useState<SpeakerSegment[]>([]);
  const [enableSpeakerIdentification, setEnableSpeakerIdentification] =
    useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState("en-US");
  const [sessionId, setSessionId] = useState<string>("");
  const [activeRecorder, setActiveRecorder] = useState<
    "provider" | "patient" | null
  >(null);

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

  // Start streaming transcription
  const startRecording = async (
    languageCode: string,
    recorder: "provider" | "patient"
  ) => {
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

      // Start transcription streaming
      const command = new StartStreamTranscriptionCommand({
        LanguageCode: languageCode as any,
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
                  console.log("New transcript received:", newTranscript);
                  console.log(
                    "Current languages - Primary:",
                    primaryLanguage,
                    "Target:",
                    targetLanguage
                  );

                  const isProviderSpeaking = recorder === "provider";
                  console.log("Is provider speaking:", isProviderSpeaking);

                  const newSegment: SpeakerSegment = {
                    id: Date.now(),
                    speaker: isProviderSpeaking ? "Doctor" : "Patient",
                    text: newTranscript,
                    timestamp: Date.now(),
                    language: isProviderSpeaking
                      ? primaryLanguage
                      : targetLanguage,
                    side: isProviderSpeaking ? "left" : "right",
                  };

                  // Add original segment
                  setSpeakerSegments((prev) => [...prev, newSegment]);
                  console.log(
                    "Added original segment to",
                    isProviderSpeaking ? "left" : "right"
                  );

                  try {
                    // Get the base language codes for translation
                    const sourceCode = isProviderSpeaking
                      ? primaryLanguage.split("-")[0]
                      : targetLanguage.split("-")[0];
                    const targetCode = isProviderSpeaking
                      ? targetLanguage.split("-")[0]
                      : primaryLanguage.split("-")[0];

                    console.log(
                      "Translation direction:",
                      sourceCode,
                      "->",
                      targetCode
                    );

                    const translatedText = await translateText(
                      newTranscript,
                      sourceCode,
                      targetCode
                    );
                    console.log("Translation result:", translatedText);

                    if (translatedText) {
                      const translatedSegment: SpeakerSegment = {
                        id: Date.now(),
                        speaker: isProviderSpeaking ? "Doctor" : "Patient",
                        text: translatedText,
                        timestamp: Date.now(),
                        language: isProviderSpeaking
                          ? targetLanguage
                          : primaryLanguage,
                        side: isProviderSpeaking ? "right" : "left",
                      };
                      setSpeakerSegments((prev) => [
                        ...prev,
                        translatedSegment,
                      ]);
                      console.log(
                        "Added translated segment to",
                        isProviderSpeaking ? "right" : "left"
                      );
                    }
                  } catch (error) {
                    console.error("Translation error:", error);
                    setError("Translation failed. Please try again.");
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
        processStream().catch((error) => {
          console.error("Process stream error:", error);
          setError("Failed to process audio stream. Please try again.");
        });
      }

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

  const getTranslateLanguageCode = (transcribeCode: string): string => {
    // Convert transcribe language code (e.g., "en-US") to translate code (e.g., "en")
    return transcribeCode.split("-")[0];
  };

  const translateText = async (
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<string | undefined> => {
    try {
      console.log("Starting translation from", fromLang, "to", toLang);

      // Get the base language codes for translation
      const sourceCode = fromLang.split("-")[0];
      const targetCode = toLang.split("-")[0];

      // Skip translation if languages are the same
      if (sourceCode === targetCode) {
        console.log("Same language, skipping translation");
        return text;
      }

      const translateCommand = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceCode,
        TargetLanguageCode: targetCode,
      });

      console.log("Sending translation request");
      const translatedResult = await translateClient.send(translateCommand);
      console.log("Translation completed:", translatedResult.TranslatedText);

      return translatedResult.TranslatedText;
    } catch (err) {
      console.error("Translation error in translateText function:", err);
      throw err;
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

  const startProviderRecording = async () => {
    if (activeRecorder === "patient") {
      await stopRecording();
    }
    setActiveRecorder("provider");
    startRecording(primaryLanguage, "provider");
  };

  const startPatientRecording = async () => {
    if (activeRecorder === "provider") {
      await stopRecording();
    }
    setActiveRecorder("patient");
    startRecording(targetLanguage, "patient"); // Use the patient's selected language for transcription
  };

  const stopRecording = async () => {
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
      setActiveRecorder(null);
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

  const handleEndConsultation = () => {
    stopRecording();
    // Additional end consultation logic here
  };

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

  // Get speaker label based on language
  const getSpeakerLabel = (speaker: "Doctor" | "Patient", language: string) => {
    const languageCode = language as SupportedLanguageCode;
    const labels = speakerLabels[languageCode] || speakerLabels["en-US"];
    return speaker === "Doctor" ? labels.doctor : labels.patient;
  };

  return (
    <div className="flex flex-col space-y-8 p-8 max-w-7xl mx-auto">
      {/* Audio Input Section */}
      <div>
        <h2 className="text-2xl font-semibold text-center mb-6">Audio Input</h2>
        <div className="grid grid-cols-2 gap-8">
          {/* Healthcare Provider */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <span className="text-4xl">👨‍⚕️</span>
              <h3 className="mt-2 font-medium">Healthcare Provider</h3>
            </div>
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-500/20"></div>
              <div className="absolute inset-2 rounded-full bg-green-500/30"></div>
              <div
                className={`absolute inset-4 rounded-full transition-colors ${
                  activeRecorder === "provider" ? "bg-red-500" : "bg-green-500"
                }`}
              ></div>
            </div>
            <p className="text-gray-600">
              {activeRecorder === "provider"
                ? "Recording..."
                : "Ready to record"}
            </p>
            <Button
              variant={
                activeRecorder === "provider" ? "destructive" : "outline"
              }
              className="w-full max-w-xs bg-slate-800 text-white hover:bg-slate-700"
              onClick={
                activeRecorder === "provider"
                  ? stopRecording
                  : startProviderRecording
              }
              disabled={
                isLoading || (isRecording && activeRecorder === "patient")
              }
            >
              <Mic className="w-4 h-4 mr-2" />
              {activeRecorder === "provider"
                ? "Stop Recording"
                : "Start Recording"}
            </Button>
          </div>

          {/* Patient/Caregiver */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <span className="text-4xl">🤒</span>
              <h3 className="mt-2 font-medium">Patient/Caregiver</h3>
            </div>
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-500/20"></div>
              <div className="absolute inset-2 rounded-full bg-green-500/30"></div>
              <div
                className={`absolute inset-4 rounded-full transition-colors ${
                  activeRecorder === "patient" ? "bg-red-500" : "bg-green-500"
                }`}
              ></div>
            </div>
            <p className="text-gray-600">
              {activeRecorder === "patient"
                ? "Recording..."
                : "Ready to record"}
            </p>
            <Button
              variant={activeRecorder === "patient" ? "destructive" : "outline"}
              className="w-full max-w-xs bg-slate-800 text-white hover:bg-slate-700"
              onClick={
                activeRecorder === "patient"
                  ? stopRecording
                  : startPatientRecording
              }
              disabled={
                isLoading || (isRecording && activeRecorder === "provider")
              }
            >
              <Mic className="w-4 h-4 mr-2" />
              {activeRecorder === "patient"
                ? "Stop Recording"
                : "Start Recording"}
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Transcript Section */}
      <div>
        <h2 className="text-2xl font-semibold text-center mb-6">
          Real-time Transcript
        </h2>
        <div className="grid grid-cols-2 gap-8">
          {/* Provider's View */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🎙️</span>
              <h3>Provider's View</h3>
            </div>
            <Select
              value={primaryLanguage}
              onValueChange={setPrimaryLanguage}
              disabled={isRecording}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {transcribeLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ScrollArea className="h-[300px] border rounded-lg bg-white p-4">
              <div className="space-y-4">
                {speakerSegments.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    Press "Start Recording" for Provider or Patient.
                  </p>
                ) : (
                  speakerSegments
                    .filter((segment) => segment.side === "left")
                    .map((segment) => (
                      <div key={segment.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600">
                            {getSpeakerLabel(
                              segment.speaker,
                              segment.language || primaryLanguage
                            )}
                            :
                          </span>
                          <p className="text-sm text-gray-900">
                            {segment.text}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Patient's View */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🌐</span>
              <h3>Patient's View</h3>
            </div>
            <Select
              value={targetLanguage}
              onValueChange={setTargetLanguage}
              disabled={isRecording}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {transcribeLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ScrollArea className="h-[300px] border rounded-lg bg-white p-4">
              <div className="space-y-4">
                {speakerSegments.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    Transcript will appear here.
                  </p>
                ) : (
                  speakerSegments
                    .filter((segment) => segment.side === "right")
                    .map((segment) => (
                      <div key={`trans-${segment.id}`} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600">
                            {getSpeakerLabel(
                              segment.speaker,
                              segment.language || targetLanguage
                            )}
                            :
                          </span>
                          <p className="text-sm text-gray-900">
                            {segment.text}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* End Consultation Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleEndConsultation}
          className="bg-slate-800 text-white hover:bg-slate-700"
          size="lg"
        >
          <FileText className="w-4 h-4 mr-2" />
          End Consultation + Summarise
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center fixed bottom-4 right-4">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Built for SuperAI Next Hackathon. Prioritizing accessibility and rapid
        deployment.
      </div>
    </div>
  );
};

export default Transcription;
