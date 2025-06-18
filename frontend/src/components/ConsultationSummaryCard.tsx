/* eslint-disable */
import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Download, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pollyClient, pollyVoices } from "../config/aws-config";
import { SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

interface ConsultationSummaryCardProps {
  summary: string;
}

const ConsultationSummaryCard: React.FC<ConsultationSummaryCardProps> = ({
  summary,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synthesize speech using Amazon Polly
  const synthesizeSpeech = async (
    text: string,
    languageCode: string = "en-US"
  ) => {
    try {
      const voice =
        pollyVoices[languageCode as keyof typeof pollyVoices] || "Joanna";

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

  // Handle audio playback
  const handlePlayAudio = async () => {
    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsGeneratingAudio(true);
      const audioUrl = await synthesizeSpeech(summary);

      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlayingAudio(false);
        };

        audio.play();
        setIsPlayingAudio(true);
      }
    } catch (err) {
      console.error("Error playing audio:", err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Handle PDF download
  const handleSaveAsPDF = () => {
    // Create a new window with the summary content
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Consultation Summary</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #1f2937;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            h2 {
              color: #374151;
              margin-top: 30px;
              margin-bottom: 15px;
            }
            h3 {
              color: #4b5563;
              margin-top: 25px;
              margin-bottom: 10px;
            }
            ul {
              margin-left: 20px;
            }
            li {
              margin-bottom: 5px;
            }
            p {
              margin-bottom: 15px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>Consultation Summary</h1>
          <div id="content"></div>
          <script>
            // Convert markdown to HTML (simple conversion for basic markdown)
            const markdown = \`${summary.replace(/`/g, "\\`")}\`;
            const content = markdown
              .replace(/^### (.*$)/gim, '<h3>$1</h3>')
              .replace(/^## (.*$)/gim, '<h2>$1</h2>')
              .replace(/^# (.*$)/gim, '<h1>$1</h1>')
              .replace(/^\\* (.*$)/gim, '<li>$1</li>')
              .replace(/\\n\\n/g, '</p><p>')
              .replace(/^(.+)$/gim, '<p>$1</p>');
            
            document.getElementById('content').innerHTML = content;
            
            // Auto-print after content loads
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow-md border p-8 max-w-3xl mx-auto relative">
      {/* Header with buttons */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <FileText className="size-8 mr-2 text-black" />
          <h1 className="text-3xl font-bold text-gray-900">
            Consultation Summary
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayAudio}
            disabled={isGeneratingAudio}
            className="flex items-center space-x-2"
          >
            {isGeneratingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlayingAudio ? (
              <Volume2 className="h-4 w-4 text-blue-600" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            <span>{isPlayingAudio ? "Stop" : "Play"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAsPDF}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Save as PDF</span>
          </Button>
        </div>
      </div>

      {/* Content */}
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
};

export default ConsultationSummaryCard;
