import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MessageSquareHeart,
  Ear,
  Accessibility,
  QrCode,
  FileText,
  Languages,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Navigation } from "../components/Navigation";

const howItHelps = [
  {
    icon: <MessageSquareHeart className="h-6 w-6 text-primary" />,
    title: "Multilingual Transcription & Summarization",
    description:
      "Clear, structured summaries in your preferred language. Say goodbye to messy notes and illegible handwriting.",
  },
  {
    icon: <Ear className="h-6 w-6 text-primary" />,
    title: "Audio Playback for Every Summary",
    description:
      "Can't read or prefer to listen? Each summary comes with natural-sounding audio making it easier for everyone to understand.",
  },
  {
    icon: <Accessibility className="h-6 w-6 text-primary" />,
    title: "Screen Reader Friendly & Fully Accessible",
    description:
      "Designed for ADA and Section 508 compliance, our summaries are navigable, readable and inclusive - supporting neurodivergent, blind, and low-vision users.",
  },
  {
    icon: <QrCode className="h-6 w-6 text-primary" />,
    title: "QR Codes for Easy Sharing",
    description:
      "Share your medical summary securely with family or caregivers. We provide you full access to your medical transcript and secure login.",
  },
  {
    icon: <FileText className="h-6 w-6 text-primary" />,
    title: "Reduces Admin Load",
    description:
      "Fewer follow-up calls and clarifications mean safer care and more time for what matters: the patient.",
  },
  {
    icon: <Languages className="h-6 w-6 text-primary" />,
    title: "Bilingual Consultations",
    description:
      "Instantly transcribe and translate consultations into structured summaries - bridging language gaps between doctors and patients to improve clarity, safety, and trust.",
  },
];

const impactStats = [
  {
    icon: <TrendingUp className="h-8 w-8 text-white" />,
    value: "89%",
    label: "Reduction in patient confusion",
  },
  {
    icon: <Clock className="h-8 w-8 text-white" />,
    value: "67%",
    label: "Decrease in follow-up calls",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href={"/"}>
              <Image
                src="/health-reach-logo.png"
                alt="Health Reach Logo"
                height={48}
                width={200}
                priority
                className="object-contain"
              />
            </Link>
            <Navigation />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Transform Medical Conversations into Clear, Accessible Summaries
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Our AI-powered tool helps healthcare providers and patients
            communicate better through instant transcription and summarization.
          </p>
          <Link
            href="/transcribe"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Start Transcribing <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        {/* Impact Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {impactStats.map((stat, index) => (
            <div key={index} className="bg-blue-600 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">{stat.icon}</div>
              <div className="text-4xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-blue-100">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {howItHelps.map((feature, index) => (
            <div key={index} className="border rounded-lg p-6">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
