/* eslint-disable */
import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Download, Volume2, Loader2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  pollyClient,
  pollyVoices,
  translateClient,
  translateLanguages,
} from "../config/aws-config";
import { SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { TranslateTextCommand } from "@aws-sdk/client-translate";

interface ConsultationSummaryCardProps {
  summary: string;
  translatedLanguage?: string;
  translatedSummary?: string | null;
}

const ConsultationSummaryCard: React.FC<ConsultationSummaryCardProps> = ({
  summary,
  translatedLanguage,
  translatedSummary: initialTranslatedSummary,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(
    initialTranslatedSummary || null
  );
  const [showTranslated, setShowTranslated] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load existing translated summary on mount
  React.useEffect(() => {
    if (initialTranslatedSummary) {
      setTranslatedSummary(initialTranslatedSummary);
    }
  }, [initialTranslatedSummary]);

  // Translate text using AWS Translate
  const translateText = async (
    text: string,
    targetLanguage: string
  ): Promise<string | null> => {
    try {
      // Convert language code from format like "en-US" to "en" for AWS Translate
      const targetCode = targetLanguage.split("-")[0];

      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: "auto", // Auto-detect source language
        TargetLanguageCode: targetCode,
      });

      const response = await translateClient.send(command);
      return response.TranslatedText || null;
    } catch (err) {
      console.error("Error translating text:", err);
      return null;
    }
  };

  // Handle translation
  const handleTranslate = async () => {
    if (!translatedLanguage) {
      console.error("Missing translated language");
      return;
    }

    try {
      setIsTranslating(true);

      // Translate the summary
      const translated = await translateText(summary, translatedLanguage);

      if (translated) {
        setTranslatedSummary(translated);
        setShowTranslated(true);
        console.log("Translation completed successfully");
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Get language name from code
  const getLanguageName = (code: string): string => {
    const lang = translateLanguages.find((l) => l.code === code.split("-")[0]);
    return lang ? lang.name : code;
  };

  // Translate the title
  const getTranslatedTitle = async (languageCode: string): Promise<string> => {
    try {
      const translated = await translateText(
        "Consultation Summary",
        languageCode
      );
      return translated || "Consultation Summary";
    } catch (err) {
      console.error("Error translating title:", err);
      return "Consultation Summary";
    }
  };

  // State for translated title
  const [translatedTitle, setTranslatedTitle] = useState<string>(
    "Consultation Summary"
  );

  // Load translated title when switching to translated view
  React.useEffect(() => {
    if (showTranslated && translatedSummary && translatedLanguage) {
      getTranslatedTitle(translatedLanguage).then(setTranslatedTitle);
    } else {
      setTranslatedTitle("Consultation Summary");
    }
  }, [showTranslated, translatedSummary, translatedLanguage]);

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
      // Use the currently displayed content for audio generation
      const contentToSpeak =
        showTranslated && translatedSummary ? translatedSummary : summary;
      const languageCode =
        showTranslated && translatedSummary ? translatedLanguage : "en-US";
      const audioUrl = await synthesizeSpeech(contentToSpeak, languageCode);

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
    // Use the currently displayed content (original or translated)
    const contentToSave =
      showTranslated && translatedSummary ? translatedSummary : summary;
    const title =
      showTranslated && translatedSummary
        ? translatedTitle
        : "Consultation Summary";

    // Create a new window with the summary content
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="${
          showTranslated && translatedSummary
            ? translatedLanguage?.split("-")[0]
            : "en"
        }">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'DejaVu Sans', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              font-size: 14px;
            }
            h1 {
              color: #1f2937;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
              margin-bottom: 20px;
              font-size: 24px;
              font-weight: bold;
            }
            h2 {
              color: #374151;
              margin-top: 30px;
              margin-bottom: 15px;
              font-size: 20px;
              font-weight: bold;
            }
            h3 {
              color: #4b5563;
              margin-top: 25px;
              margin-bottom: 10px;
              font-size: 18px;
              font-weight: 600;
            }
            ul {
              margin-left: 20px;
              margin-bottom: 15px;
            }
            li {
              margin-bottom: 5px;
            }
            p {
              margin-bottom: 15px;
            }
            strong {
              font-weight: bold;
            }
            em {
              font-style: italic;
            }
            @media print {
              body {
                padding: 0;
                font-size: 12px;
              }
              h1 { font-size: 20px; }
              h2 { font-size: 16px; }
              h3 { font-size: 14px; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div id="content"></div>
          <script>
            // More robust markdown to HTML conversion
            function markdownToHtml(markdown) {
              if (!markdown) return '';
              
              let html = markdown
                // Headers
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                // Bold and italic
                .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
                // Lists
                .replace(/^\\* (.*$)/gim, '<li>$1</li>')
                .replace(/^- (.*$)/gim, '<li>$1</li>')
                // Wrap lists in ul tags
                .replace(/(<li>.*<\\/li>)/gs, '<ul>$1</ul>')
                // Paragraphs
                .replace(/\\n\\n/g, '</p><p>')
                .replace(/^(.+)$/gim, '<p>$1</p>')
                // Clean up empty paragraphs
                .replace(/<p><\\/p>/g, '')
                // Clean up nested ul tags
                .replace(/<ul><ul>/g, '<ul>')
                .replace(/<\\/ul><\\/ul>/g, '</ul>');
              
              return html;
            }
            
            const markdown = \`${contentToSave
              .replace(/`/g, "\\`")
              .replace(/\$/g, "\\$")}\`;
            const content = markdownToHtml(markdown);
            
            document.getElementById('content').innerHTML = content;
            
            // Auto-print after content loads
            setTimeout(() => {
              window.print();
              window.close();
            }, 1000);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow-md border p-8 max-w-3xl mx-auto relative">
      {/* Minimal header */}
      <div className="flex items-center mb-6">
        <FileText className="size-6 mr-2 text-black" />
        <h1 className="text-2xl font-bold text-gray-900">{translatedTitle}</h1>
      </div>

      {/* Content */}
      <div className="prose max-w-none mb-6">
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
          {showTranslated && translatedSummary ? translatedSummary : summary}
        </ReactMarkdown>
      </div>

      {/* Language indicator */}
      {translatedLanguage && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Languages className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                {showTranslated && translatedSummary
                  ? `Translated to ${getLanguageName(translatedLanguage)}`
                  : "Original summary"}
              </span>
            </div>
            {translatedSummary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTranslated(!showTranslated)}
                className="text-xs"
              >
                {showTranslated ? "Show Original" : "Show Translation"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons at bottom */}
      <div className="flex items-center space-x-2 pt-4">
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

        {translatedLanguage && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTranslate}
            disabled={isTranslating}
            className="flex items-center space-x-2"
          >
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            <span>
              {isTranslating
                ? "Translating..."
                : translatedSummary
                ? "Re-translate"
                : `Translate to ${getLanguageName(translatedLanguage)}`}
            </span>
          </Button>
        )}

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
  );
};

export default ConsultationSummaryCard;
