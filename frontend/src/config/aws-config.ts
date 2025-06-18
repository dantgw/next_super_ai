import { TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import { TranslateClient } from "@aws-sdk/client-translate";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

// AWS Configuration
export const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "",
  },
};

// Initialize AWS clients
export const transcribeClient = new TranscribeStreamingClient(awsConfig);
export const translateClient = new TranslateClient(awsConfig);
export const bedrockClient = new BedrockRuntimeClient(awsConfig);

// Supported languages for AWS Transcribe
export const transcribeLanguages = [
  { code: "en-US", name: "English (US)" },
  { code: "es-US", name: "Spanish (US)" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ar-SA", name: "Arabic" },
  { code: "hi-IN", name: "Hindi" },
  { code: "ja-JP", name: "Japanese" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ko-KR", name: "Korean" },
];

// Supported languages for AWS Translate
export const translateLanguages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ko", name: "Korean" },
];

// Speaker labels in different languages
export const speakerLabels = {
  "en-US": { doctor: "Doctor", patient: "Patient" },
  "es-US": { doctor: "Doctor", patient: "Paciente" },
  "fr-FR": { doctor: "Médecin", patient: "Patient" },
  "de-DE": { doctor: "Arzt", patient: "Patient" },
  "it-IT": { doctor: "Dottore", patient: "Paziente" },
  "pt-BR": { doctor: "Médico", patient: "Paciente" },
  "ar-SA": { doctor: "طبيب", patient: "مريض" },
  "hi-IN": { doctor: "डॉक्टर", patient: "मरीज़" },
  "ja-JP": { doctor: "医師", patient: "患者" },
  "zh-CN": { doctor: "医生", patient: "患者" },
  "ko-KR": { doctor: "의사", patient: "환자" },
};
