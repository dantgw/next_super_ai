/* eslint-disable */
"use client";
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  transcribeClient,
  translateClient,
  bedrockClient,
  pollyClient,
  transcribeLanguages,
  speakerLabels,
  pollyVoices,
} from "../config/aws-config";
import { StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { TranslateTextCommand } from "@aws-sdk/client-translate";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
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
import { Mic, StopCircle, Loader2, FileText, Volume2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import ConsultationSummaryCard from "./ConsultationSummaryCard";

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
  audioUrl?: string | null;
}

// Add type for supported language codes
type SupportedLanguageCode = keyof typeof speakerLabels;

// Add isPatientTranslation to SpeakerSegment for translation segments
type SpeakerSegmentWithTranslation = SpeakerSegment & {
  isPatientTranslation?: boolean;
};

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
  const [isPlayingAudio, setIsPlayingAudio] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const microphoneStreamRef = useRef<MicrophoneStream | null>(null);
  const transcribeStreamRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const originalScrollAreaRef = useRef<HTMLDivElement>(null);
  const translatedScrollAreaRef = useRef<HTMLDivElement>(null);
  const originalContentRef = useRef<HTMLDivElement>(null);
  const translatedContentRef = useRef<HTMLDivElement>(null);

  const SAMPLE_RATE = 44100;

  // Add auto-play state
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);

  // Add patient email state
  const [patientEmail, setPatientEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  // Email validation
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Add summaryResult state
  const [summaryResult, setSummaryResult] = useState<string>("");

  useEffect(() => {
    setSessionId(
      `SESSION_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`
    );
  }, []);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const viewport = ref.current.querySelector(
        '[data-radix-scroll-area-viewport=""]'
      ) as HTMLElement;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  };

  useLayoutEffect(() => {
    if (speakerSegments.length > 0) {
      scrollToBottom(originalScrollAreaRef);
      scrollToBottom(translatedScrollAreaRef);
    }
  }, [speakerSegments]);

  // Auto-scroll setup using MutationObserver
  useEffect(() => {
    const setupAutoScroll = (
      contentRef: React.RefObject<HTMLDivElement | null>,
      scrollAreaRef: React.RefObject<HTMLDivElement | null>
    ) => {
      const content = contentRef.current;
      const scrollArea = scrollAreaRef.current;

      if (!content || !scrollArea) return undefined;

      const observer = new MutationObserver(() => {
        const viewport = scrollArea.querySelector(
          '[data-radix-scroll-area-viewport=""]'
        );
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      });

      observer.observe(content, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => observer.disconnect();
    };

    const cleanup1 = setupAutoScroll(originalContentRef, originalScrollAreaRef);
    const cleanup2 = setupAutoScroll(
      translatedContentRef,
      translatedScrollAreaRef
    );

    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, []);

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
              // Skip processing if audio is currently playing to prevent feedback loop
              if (isAudioCurrentlyPlaying()) {
                console.log(
                  "Skipping transcription processing - audio is playing"
                );
                setDebugInfo("Transcription paused - audio is playing");
                continue;
              }

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

                  // Add original segment immediately
                  await addSegmentWithAudio(newSegment);
                  console.log(
                    "Added original segment to",
                    isProviderSpeaking ? "left" : "right"
                  );

                  // Handle translation asynchronously without blocking
                  const sourceCode = isProviderSpeaking
                    ? primaryLanguage.split("-")[0]
                    : targetLanguage.split("-")[0];
                  const targetCode = isProviderSpeaking
                    ? targetLanguage.split("-")[0]
                    : primaryLanguage.split("-")[0];

                  // Start translation without awaiting
                  await handleTranslation(newTranscript, isProviderSpeaking);
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

  // const processWithBedrock = async (text: string) => {
  //   try {
  //     const bedrockCommand = new InvokeModelCommand({
  //       modelId: "anthropic.claude-v2",
  //       body: JSON.stringify({
  //         prompt: `\n\nHuman: Please analyze this medical transcription and provide any relevant medical context or corrections: "${text}"\n\nAssistant:`,
  //         max_tokens_to_sample: 500,
  //         temperature: 0.7,
  //       }),
  //       contentType: "application/json",
  //     });

  //     const llmResponse = await bedrockClient.send(bedrockCommand);
  //     console.log("LLM response:", llmResponse);
  //   } catch (err) {
  //     console.error("Bedrock error:", err);
  //   }
  // };

  // Add function to check if audio is currently playing
  const isAudioCurrentlyPlaying = () => isPlayingAudio !== null;

  // Modify startProviderRecording
  const startProviderRecording = async () => {
    // Prevent recording if audio is playing
    if (isAudioCurrentlyPlaying()) {
      setError("Please stop audio playback before starting recording");
      return;
    }

    if (activeRecorder === "patient") {
      await stopRecording();
    }
    setActiveRecorder("provider");
    startRecording(primaryLanguage, "provider");
  };

  // Modify startPatientRecording
  const startPatientRecording = async () => {
    // Prevent recording if audio is playing
    if (isAudioCurrentlyPlaying()) {
      setError("Please stop audio playback before starting recording");
      return;
    }

    if (activeRecorder === "provider") {
      await stopRecording();
    }
    setActiveRecorder("patient");
    startRecording(targetLanguage, "patient");
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

  const createMicrophoneStream = async () => {
    microphoneStreamRef.current = new MicrophoneStream();
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
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

  // Add synthesizeSpeech function
  const synthesizeSpeech = async (text: string, languageCode: string) => {
    try {
      const voice = pollyVoices[languageCode as keyof typeof pollyVoices];

      const command = new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: voice as any,
        OutputFormat: "mp3",
        Engine: "neural",
      });

      const response = await pollyClient.send(command);

      if (response.AudioStream) {
        const blob = new Blob(
          [await response.AudioStream.transformToByteArray()],
          { type: "audio/mpeg" }
        );
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (err) {
      console.error("Error synthesizing speech:", err);
      return null;
    }
  };

  // Modify the existing code where we add segments to include audio synthesis
  const addSegmentWithAudio = async (
    segment: SpeakerSegmentWithTranslation
  ) => {
    try {
      const audioUrl = await synthesizeSpeech(
        segment.text,
        segment.language || primaryLanguage
      );
      const segmentWithAudio = { ...segment, audioUrl };
      setSpeakerSegments((prev) => [...prev, segmentWithAudio]);

      // Auto-play the audio if enabled and it's a translation for the patient
      if (autoPlayEnabled && segment.isPatientTranslation && audioUrl) {
        setTimeout(() => {
          handlePlayAudio(segmentWithAudio.id, audioUrl);
        }, 100);
      }
    } catch (err) {
      console.error("Error adding segment with audio:", err);
      setSpeakerSegments((prev) => [...prev, segment]);
    }
  };

  // Add audio playback control
  const handlePlayAudio = async (
    segmentId: number,
    audioUrl: string | null | undefined
  ) => {
    if (!audioUrl) return;

    try {
      // Stop any active recording first
      if (isRecording) {
        await stopRecording();
      }

      if (isPlayingAudio === segmentId) {
        audioRef.current?.pause();
        setIsPlayingAudio(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(null);
        // Add a small delay to prevent immediate transcription of residual audio
        setTimeout(() => {
          console.log("Audio playback ended, ready for new transcription");
          setDebugInfo("Ready for transcription");
        }, 500);
      };

      // Add a fallback timeout to clear playing state
      const audioDuration = audio.duration || 10; // Default to 10 seconds if duration is unknown
      setTimeout(() => {
        if (isPlayingAudio === segmentId) {
          console.log("Audio playback timeout - clearing state");
          setIsPlayingAudio(null);
          setDebugInfo("Ready for transcription");
        }
      }, (audioDuration + 1) * 1000); // Add 1 second buffer

      audio.play();
      setIsPlayingAudio(segmentId);
    } catch (err) {
      console.error("Error playing audio:", err);
      setError("Failed to play audio");
    }
  };

  // Modify the translation handling code
  const handleTranslation = async (
    newTranscript: string,
    isProviderSpeaking: boolean
  ) => {
    const sourceCode = isProviderSpeaking
      ? primaryLanguage.split("-")[0]
      : targetLanguage.split("-")[0];
    const targetCode = isProviderSpeaking
      ? targetLanguage.split("-")[0]
      : primaryLanguage.split("-")[0];

    try {
      const translatedText = await translateText(
        newTranscript,
        sourceCode,
        targetCode
      );
      if (translatedText) {
        // Determine if this translation is for the patient
        const side = isProviderSpeaking ? "right" : "left";
        const isPatientTranslation =
          (isProviderSpeaking && side === "right") ||
          (!isProviderSpeaking && side === "left");
        const translatedSegment: SpeakerSegmentWithTranslation = {
          id: Date.now(),
          speaker: isProviderSpeaking ? "Doctor" : "Patient",
          text: translatedText,
          timestamp: Date.now(),
          language: isProviderSpeaking ? targetLanguage : primaryLanguage,
          side,
          isPatientTranslation,
        };
        await addSegmentWithAudio(translatedSegment);
      }
    } catch (error) {
      console.error("Translation error:", error);
      setError("Translation failed. Please try again.");
    }
  };

  // Update the segment rendering in the return statement to include audio playback buttons
  const renderSegment = (segment: SpeakerSegment) => (
    <div
      key={segment.id}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        segment.speaker === "Doctor"
          ? "bg-blue-50 border-blue-200 hover:border-blue-300"
          : "bg-green-50 border-green-200 hover:border-green-300"
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          segment.speaker === "Doctor" ? "bg-blue-100" : "bg-green-100"
        }`}
      >
        <span
          className={`text-xs font-medium ${
            segment.speaker === "Doctor" ? "text-blue-600" : "text-green-600"
          }`}
        >
          {segment.speaker === "Doctor" ? "D" : "P"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-sm font-medium ${
              segment.speaker === "Doctor" ? "text-blue-700" : "text-green-700"
            }`}
          >
            {getSpeakerLabel(
              segment.speaker,
              segment.language || primaryLanguage
            )}
          </span>
          {segment.audioUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePlayAudio(segment.id, segment.audioUrl)}
              className={`h-6 w-6 p-0 ${
                isPlayingAudio === segment.id
                  ? segment.speaker === "Doctor"
                    ? "text-blue-600"
                    : "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <Volume2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-900 leading-relaxed">{segment.text}</p>
      </div>
    </div>
  );

  const clearTranscription = () => {
    setTranscription("");
    setTranslatedText("");
    setSpeakerSegments([]);
    setError(null);
    setDebugInfo("");
    setSummaryResult("");
  };

  // Update handleEndConsultation to require email
  const handleEndConsultation = async () => {
    console.log("=== handleEndConsultation started ===");
    console.log("Current patientEmail:", patientEmail);
    console.log("Current emailTouched:", emailTouched);
    console.log(
      "Current isValidEmail(patientEmail):",
      isValidEmail(patientEmail)
    );

    setEmailTouched(true);
    console.log("Set emailTouched to true");

    if (!isValidEmail(patientEmail)) {
      console.log("Email validation failed, returning early");
      return;
    }

    console.log("Email validation passed, proceeding with consultation end");

    try {
      console.log("=== Step 1: Stopping recording ===");
      // Stop recording first
      await stopRecording();
      console.log("Recording stopped successfully");

      console.log("=== Step 1.5: Checking state after recording stop ===");
      console.log("speakerSegments state:", speakerSegments);
      console.log("speakerSegments type:", typeof speakerSegments);
      console.log("speakerSegments length:", speakerSegments?.length);
      console.log("primaryLanguage:", primaryLanguage);
      console.log("targetLanguage:", targetLanguage);
      console.log("patientEmail:", patientEmail);

      console.log("=== Step 2: Creating consultation text ===");
      console.log("Current speakerSegments:", speakerSegments);
      console.log("Number of segments:", speakerSegments.length);

      // Create consultation text from speaker segments
      const consultationText = speakerSegments
        .map((segment) => `${segment.speaker}: ${segment.text}`)
        .join("\n\n");
      console.log("Generated consultationText:", consultationText);

      console.log("=== Step 3: Creating translated consultation text ===");
      // Create translated consultation text from translated segments
      const translatedSegments = speakerSegments.filter(
        (segment) =>
          segment.language !==
          (segment.side === "left" ? primaryLanguage : targetLanguage)
      );
      console.log("Filtered translatedSegments:", translatedSegments);

      const translatedText =
        translatedSegments.length > 0
          ? translatedSegments
              .map((segment) => `${segment.speaker}: ${segment.text}`)
              .join("\n\n")
          : null;
      console.log("Generated translatedText:", translatedText);

      console.log("=== Step 4: Generating summary with Bedrock ===");
      // Generate summary using Bedrock
      const prompt = `You are a medical scribe AI. Generate a consultation summary in markdown format using the following template. Use '##' for section headings and '-' for bullet lists. Do not use any HTML tags. Do not include a main heading like 'Consultation Summary'. Here is the template:

## Patient Presentation
[Summarize how the patient presented, including their chief complaint and initial presentation]

## Key Symptoms Reported
- Symptom 1
- Symptom 2
...

## Additional Information
[Include any relevant medical history, examination findings, test results, or other important information discussed]

## Recommendation
[Summarize the healthcare provider's recommendations, including any prescribed treatments, follow-up instructions, medications, or lifestyle advice]

Consultation transcript:
${consultationText}

Generate the summary in markdown using the above structure, replacing the bracketed sections with the appropriate information from the transcript.`;
      console.log("Bedrock prompt:", prompt);

      const bedrockCommand = new InvokeModelCommand({
        modelId: "us.meta.llama4-maverick-17b-instruct-v1:0",
        body: JSON.stringify({
          prompt: prompt,
          max_gen_len: 500,
          temperature: 0.3,
        }),
        contentType: "application/json",
      });
      console.log("Bedrock command created:", bedrockCommand);

      console.log("Sending Bedrock request...");
      const bedrockResponse = await bedrockClient.send(bedrockCommand);
      console.log("Bedrock response received:", bedrockResponse);

      let summaryText;
      if (bedrockResponse.body) {
        console.log("Processing Bedrock response body...");
        const responseText = new TextDecoder().decode(bedrockResponse.body);
        console.log("Decoded response text:", responseText);
        const parsedResponse = JSON.parse(responseText);
        console.log("Parsed response:", parsedResponse);
        summaryText = parsedResponse.generation || "No summary generated.";
        console.log("Extracted summaryText:", summaryText);
        setSummaryResult(summaryText);
      } else {
        console.log("No Bedrock response body found");
        summaryText = "No summary generated.";
        setSummaryResult(summaryText);
      }

      console.log("=== Step 5: Calling summaries API ===");
      const apiPayload = {
        summary_text: summaryText,
        transcribed_text: consultationText,
        translated_text: translatedText,
        email: patientEmail,
        transcript_language: primaryLanguage,
        translated_language: targetLanguage,
      };
      console.log("API payload:", apiPayload);

      console.log("Making fetch request to /api/summaries...");
      const response = await fetch("/api/summaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiPayload),
      });
      console.log("Fetch response received:", response);
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        console.log("API request failed with status:", response.status);
        throw new Error(data.error || "Failed to save consultation summary");
      }

      toast.success("Patient's case has been successfully saved!");

      setPatientEmail("");
      console.log("Patient email cleared");

      setEmailTouched(false);
      console.log("Email touched reset to false");

      console.log("=== handleEndConsultation completed successfully ===");
    } catch (err) {
      console.error("=== handleEndConsultation ERROR ===");
      console.error("Error details:", err);
      console.error(
        "Error message:",
        err instanceof Error ? err.message : "Unknown error"
      );
      console.error(
        "Error stack:",
        err instanceof Error ? err.stack : "No stack trace"
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate and save consultation summary. Please try again."
      );
      console.log(
        "Set error message:",
        err instanceof Error
          ? err.message
          : "Failed to generate and save consultation summary. Please try again."
      );
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Medical Consultation Translator
        </h1>
        <p className="text-gray-600">
          Real-time transcription and translation for healthcare providers and
          patients
        </p>
      </div>

      {/* Auto-play toggle */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
          <Checkbox
            id="auto-play"
            checked={autoPlayEnabled}
            onCheckedChange={(checked) => setAutoPlayEnabled(checked === true)}
            className="border-gray-300"
          />
          <label
            htmlFor="auto-play"
            className="text-sm text-gray-700 cursor-pointer select-none"
          >
            Auto-play translations
          </label>
        </div>
      </div>

      {/* Debug info and status indicators */}
      {/* <div className="flex justify-center space-x-4">
        {debugInfo && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-3 py-2 text-sm">
            <span className="mr-2">ℹ️</span>
            {debugInfo}
          </div>
        )}
        {isAudioCurrentlyPlaying() && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-3 py-2 text-sm">
            <span className="mr-2">🔇</span>
            Transcription paused - audio playing
          </div>
        )}
      </div> */}

      {/* Transcript Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider's View */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-lg">👨‍⚕️</span>
              <h3 className="font-semibold text-gray-900">Provider View</h3>
            </div>
          </div>
          <ScrollArea className="h-[500px]" ref={originalScrollAreaRef}>
            <div className="p-4 space-y-3" ref={originalContentRef}>
              {speakerSegments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🎙️</div>
                  <p className="text-gray-500">
                    Start recording to see the conversation
                  </p>
                </div>
              ) : (
                speakerSegments
                  .filter((segment) => segment.side === "left")
                  .map(renderSegment)
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Patient's View */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🤒</span>
              <h3 className="font-semibold text-gray-900">Patient View</h3>
            </div>
          </div>
          <ScrollArea className="h-[500px]" ref={translatedScrollAreaRef}>
            <div className="p-4 space-y-3" ref={translatedContentRef}>
              {speakerSegments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🌐</div>
                  <p className="text-gray-500">Translations will appear here</p>
                </div>
              ) : (
                speakerSegments
                  .filter((segment) => segment.side === "right")
                  .map(renderSegment)
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provider Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl">👨‍⚕️</span>
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
            </div>

            <Button
              variant={
                activeRecorder === "provider" ? "destructive" : "default"
              }
              className={`w-full ${
                activeRecorder !== "provider"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }`}
              onClick={
                activeRecorder === "provider"
                  ? stopRecording
                  : startProviderRecording
              }
              disabled={
                isLoading ||
                (isRecording && activeRecorder === "patient") ||
                isAudioCurrentlyPlaying()
              }
            >
              <Mic
                className={`w-4 h-4 mr-2 ${
                  activeRecorder === "provider" ? "text-white" : "text-white"
                }`}
              />
              <span
                className={
                  activeRecorder === "provider" ? "text-white" : "text-white"
                }
              >
                {activeRecorder === "provider"
                  ? "Stop Recording"
                  : "Start Recording"}
              </span>
            </Button>
          </div>
        </div>

        {/* Patient Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-xl">🤒</span>
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
            </div>

            <Button
              variant={activeRecorder === "patient" ? "destructive" : "default"}
              className={`w-full ${
                activeRecorder !== "patient"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }`}
              onClick={
                activeRecorder === "patient"
                  ? stopRecording
                  : startPatientRecording
              }
              disabled={
                isLoading ||
                (isRecording && activeRecorder === "provider") ||
                isAudioCurrentlyPlaying()
              }
            >
              <Mic
                className={`w-4 h-4 mr-2 ${
                  activeRecorder === "patient" ? "text-white" : "text-white"
                }`}
              />
              <span
                className={
                  activeRecorder === "patient" ? "text-white" : "text-white"
                }
              >
                {activeRecorder === "patient"
                  ? "Stop Recording"
                  : "Start Recording"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Email & End Consultation */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="max-w-md mx-auto space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-2">
              End Consultation
            </h3>
            <p className="text-sm text-gray-600">
              Enter patient's email to send consultation summary
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                emailTouched && !isValidEmail(patientEmail)
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="patient@example.com"
            />
            {emailTouched && !isValidEmail(patientEmail) && (
              <p className="text-xs text-red-500">
                Please enter a valid email address
              </p>
            )}
          </div>

          <Button
            onClick={() => {
              console.log("End Consultation button clicked!");
              console.log(
                "Button disabled state:",
                !isValidEmail(patientEmail)
              );
              console.log("Current patientEmail:", patientEmail);
              handleEndConsultation();
            }}
            className="w-full cursor-pointer"
            size="lg"
            disabled={!isValidEmail(patientEmail)}
          >
            <FileText className="w-4 h-4 mr-2" />
            End Consultation & Send Summary
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      {summaryResult && <ConsultationSummaryCard summary={summaryResult} />}

      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center shadow-lg max-w-sm">
          <span className="mr-2">⚠️</span>
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};

export default Transcription;
