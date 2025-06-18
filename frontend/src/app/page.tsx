import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  MessageSquareHeart,
  Ear,
  Accessibility,
  QrCode,
  FileText,
  Globe,
  Languages,
  Mic,
  LanguagesIcon as TranslateIcon,
  Volume2,
  LockIcon as SecurityIcon,
  TrendingUp,
  Clock,
  ShieldCheck,
  Star,
  UserCircle2,
} from "lucide-react";
import { Navigation } from "../components/Navigation";

const getFlagEmoji = (countryCode: string | undefined): string => {
  if (!countryCode) return "🏳️";
  if (countryCode === "SCT") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  if (countryCode === "WLS") return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  if (countryCode === "ENG") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  if (countryCode.length !== 2) return "🌍";
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 0x1f1e6 + (char.charCodeAt(0) - 0x41));
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    console.warn(`Could not generate flag for ${countryCode}`, error);
    return "🌍";
  }
};

const supportedLanguagesList = [
  { name: "Abkhaz", code: "ab-GE", displayCode: "GE" },
  { name: "Afrikaans", code: "af-ZA", displayCode: "ZA" },
  { name: "Arabic, Gulf", code: "ar-AE", displayCode: "AE" },
  { name: "Arabic, Modern Standard", code: "ar-SA", displayCode: "SA" },
  { name: "Armenian", code: "hy-AM", displayCode: "AM" },
  { name: "Asturian", code: "ast-ES", displayCode: "ES" },
  { name: "Azerbaijani", code: "az-AZ", displayCode: "AZ" },
  { name: "Bashkir", code: "ba-RU", displayCode: "RU" },
  { name: "Basque", code: "eu-ES", displayCode: "ES" },
  { name: "Belarusian", code: "be-BY", displayCode: "BY" },
  { name: "Bengali", code: "bn-IN", displayCode: "IN" },
  { name: "Bosnian", code: "bs-BA", displayCode: "BA" },
  { name: "Bulgarian", code: "bg-BG", displayCode: "BG" },
  { name: "Catalan", code: "ca-ES", displayCode: "ES" },
  { name: "Central Kurdish, Iran", code: "ckb-IR", displayCode: "IR" },
  { name: "Central Kurdish, Iraq", code: "ckb-IQ", displayCode: "IQ" },
  { name: "Chinese, Cantonese", code: "zh-HK (yue-HK)", displayCode: "HK" },
  { name: "Chinese, Simplified", code: "zh-CN", displayCode: "CN" },
  { name: "Chinese, Traditional", code: "zh-TW", displayCode: "TW" },
  { name: "Croatian", code: "hr-HR", displayCode: "HR" },
  { name: "Czech", code: "cs-CZ", displayCode: "CZ" },
  { name: "Danish", code: "da-DK", displayCode: "DK" },
  { name: "Dutch", code: "nl-NL", displayCode: "NL" },
  { name: "English, Australian", code: "en-AU", displayCode: "AU" },
  { name: "English, British", code: "en-GB", displayCode: "GB" },
  { name: "English, Indian", code: "en-IN", displayCode: "IN" },
  { name: "English, Irish", code: "en-IE", displayCode: "IE" },
  { name: "English, New Zealand", code: "en-NZ", displayCode: "NZ" },
  { name: "English, Scottish", code: "en-AB", displayCode: "SCT" },
  { name: "English, South African", code: "en-ZA", displayCode: "ZA" },
  { name: "English, US", code: "en-US", displayCode: "US" },
  { name: "English, Welsh", code: "en-WL", displayCode: "WLS" },
  { name: "Estonian", code: "et-ET", displayCode: "ET" },
  { name: "Farsi", code: "fa-IR", displayCode: "IR" },
  { name: "Finnish", code: "fi-FI", displayCode: "FI" },
  { name: "French", code: "fr-FR", displayCode: "FR" },
  { name: "French, Canadian", code: "fr-CA", displayCode: "CA" },
  { name: "Galician", code: "gl-ES", displayCode: "ES" },
  { name: "Georgian", code: "ka-GE", displayCode: "GE" },
  { name: "German", code: "de-DE", displayCode: "DE" },
  { name: "German, Swiss", code: "de-CH", displayCode: "CH" },
  { name: "Greek", code: "el-GR", displayCode: "GR" },
  { name: "Gujarati", code: "gu-IN", displayCode: "IN" },
  { name: "Hausa", code: "ha-NG", displayCode: "NG" },
  { name: "Hebrew", code: "he-IL", displayCode: "IL" },
  { name: "Hindi, Indian", code: "hi-IN", displayCode: "IN" },
  { name: "Hungarian", code: "hu-HU", displayCode: "HU" },
  { name: "Icelandic", code: "is-IS", displayCode: "IS" },
  { name: "Indonesian", code: "id-ID", displayCode: "ID" },
  { name: "Italian", code: "it-IT", displayCode: "IT" },
  { name: "Japanese", code: "ja-JP", displayCode: "JP" },
  { name: "Kabyle", code: "kab-DZ", displayCode: "DZ" },
  { name: "Kannada", code: "kn-IN", displayCode: "IN" },
  { name: "Kazakh", code: "kk-KZ", displayCode: "KZ" },
  { name: "Kinyarwanda", code: "rw-RW", displayCode: "RW" },
  { name: "Korean", code: "ko-KR", displayCode: "KR" },
  { name: "Kyrgyz", code: "ky-KG", displayCode: "KG" },
  { name: "Latvian", code: "lv-LV", displayCode: "LV" },
  { name: "Lithuanian", code: "lt-LT", displayCode: "LT" },
  { name: "Luganda", code: "lg-IN", displayCode: "UG" },
  { name: "Macedonian", code: "mk-MK", displayCode: "MK" },
  { name: "Malay", code: "ms-MY", displayCode: "MY" },
  { name: "Malayalam", code: "ml-IN", displayCode: "IN" },
  { name: "Maltese", code: "mt-MT", displayCode: "MT" },
  { name: "Marathi", code: "mr-IN", displayCode: "IN" },
  { name: "Meadow Mari", code: "mhr-RU", displayCode: "RU" },
  { name: "Mongolian", code: "mn-MN", displayCode: "MN" },
  { name: "Norwegian Bokmål", code: "no-NO", displayCode: "NO" },
  { name: "Odia/Oriya", code: "or-IN", displayCode: "IN" },
  { name: "Pashto", code: "ps-AF", displayCode: "AF" },
  { name: "Polish", code: "pl-PL", displayCode: "PL" },
  { name: "Portuguese", code: "pt-PT", displayCode: "PT" },
  { name: "Portuguese, Brazilian", code: "pt-BR", displayCode: "BR" },
  { name: "Punjabi", code: "pa-IN", displayCode: "IN" },
  { name: "Romanian", code: "ro-RO", displayCode: "RO" },
  { name: "Russian", code: "ru-RU", displayCode: "RU" },
  { name: "Serbian", code: "sr-RS", displayCode: "RS" },
  { name: "Sinhala", code: "si-LK", displayCode: "LK" },
  { name: "Slovak", code: "sk-SK", displayCode: "SK" },
  { name: "Slovenian", code: "sl-SI", displayCode: "SI" },
  { name: "Somali", code: "so-SO", displayCode: "SO" },
  { name: "Spanish", code: "es-ES", displayCode: "ES" },
  { name: "Spanish, US", code: "es-US", displayCode: "US" },
  { name: "Sundanese", code: "su-ID", displayCode: "ID" },
  { name: "Swahili, Kenya", code: "sw-KE", displayCode: "KE" },
  { name: "Swahili, Burundi", code: "sw-BI", displayCode: "BI" },
  { name: "Swahili, Rwanda", code: "sw-RW", displayCode: "RW" },
  { name: "Swahili, Tanzania", code: "sw-TZ", displayCode: "TZ" },
  { name: "Swahili, Uganda", code: "sw-UG", displayCode: "UG" },
  { name: "Swedish", code: "sv-SE", displayCode: "SE" },
  { name: "Tagalog/Filipino", code: "tl-PH", displayCode: "PH" },
  { name: "Tamil", code: "ta-IN", displayCode: "IN" },
  { name: "Tatar", code: "tt-RU", displayCode: "RU" },
  { name: "Telugu", code: "te-IN", displayCode: "IN" },
  { name: "Thai", code: "th-TH", displayCode: "TH" },
  { name: "Turkish", code: "tr-TR", displayCode: "TR" },
  { name: "Ukrainian", code: "uk-UA", displayCode: "UA" },
  { name: "Uyghur", code: "ug-CN", displayCode: "CN" },
  { name: "Uzbek", code: "uz-UZ", displayCode: "UZ" },
  { name: "Vietnamese", code: "vi-VN", displayCode: "VN" },
  { name: "Welsh", code: "cy-WL", displayCode: "WLS" },
  { name: "Wolof", code: "wo-SN", displayCode: "SN" },
  { name: "Zulu", code: "zu-ZA", displayCode: "ZA" },
];

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
      "Can&apos;t read or prefer to listen? Each summary comes with natural-sounding audio making it easier for everyone to understand.",
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
  {
    icon: <Globe className="h-8 w-8 text-white" />,
    value: "50+",
    label: "Languages supported",
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-white" />,
    value: "100%",
    label: "HIPAA compliance rate",
  },
];

const testimonials = [
  {
    quote:
      "This platform has completely transformed how I communicate with patients. They now leave the consult with clear, personalized notes - and I spend less time repeating myself or fielding follow-up calls.",
    name: "Dr. Sarah Lim",
    title: "General Practitioner, Sydney",
  },
  {
    quote:
      "For patients who don&apos;t speak English well, this tool has been a game-changer. Real-time translation and playback mean they actually understand what I&apos;ve said - and that leads to better outcomes.",
    name: "Dr. Michael Rahman",
    title: "Family Medicine, Chicago",
  },
  {
    quote:
      "I care for many elderly patients who struggle with memory or vision issues. Now they can revisit everything we discussed, in text or audio, and even share it with family. It&apos;s made care more inclusive - and safer.",
    name: "Dr. Priya Desai",
    title: "Geriatric Specialist, Singapore",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-background z-20 relative border-b">
        <div className="container mx-auto py-4 px-4 md:px-8 flex justify-between items-center">
          <Link href="/" className="inline-block">
            <Image
              src="/health-reach-logo.png"
              alt="Health Reach Logo"
              width={200}
              height={50}
              className="h-[50px] w-auto md:h-[60px]"
              priority
            />
          </Link>
          <Navigation />
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section
          id="about"
          className="relative flex flex-col items-center justify-center text-center min-h-[70vh] lg:min-h-[80vh] overflow-hidden bg-background"
        >
          <div className="container mx-auto px-4 z-10 relative py-12 md:py-20">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-slate-900 dark:text-slate-50">
              Beyond Transcriptions.
              <span className="block">Because Patients Deserve Clarity.</span>
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-slate-700 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
              <span>
                Real-time AI transcription and summaries in your language.
              </span>
              <span className="block mt-1">
                Accessible, accurate and HIPAA-compliant.
              </span>
            </h2>
            <p className="text-md md:text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Confused patients, language gaps, forgotten instructions - it ends
              here. Our platform turns live consultations into structured
              summaries, translated and spoken back in seconds.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-left max-w-xl mx-auto mb-10 text-slate-700 dark:text-slate-300">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span>AI-powered</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span>Real-time transcription</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span>Access After Consultation</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span>Multilingual Input and Output</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span>Screen-reader friendly</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <span>HIPAA-Compliant</span>
              </div>
            </div>
            <Link
              href="/transcribe"
              className="inline-flex items-center px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-medium rounded-md transition-colors"
            >
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              HIPAA-Compliant & Secure
            </p>
          </div>
        </section>

        {/* Measurable Impact Section */}
        <section id="about" className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900 dark:text-slate-50">
                Measurable Impact on Healthcare
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                Real results from healthcare providers using HealthReach
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
              {impactStats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center flex flex-col items-center"
                >
                  <div className="mb-4 p-4 rounded-full bg-teal-500/90 inline-block">
                    {stat.icon}
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-teal-600 dark:text-teal-300 mb-1">
                    {stat.value}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission/Solution Section */}
        <section id="faq" className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-semibold text-primary mb-3">
                Be Seen. Be Heard. Be Understood.
              </h3>
              <h4>Healthcare Made Accessible</h4>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
                Our AI turns complex consultations into clear, accessible
                summaries - so every patient leaves informed, confident, and
                supported.
              </p>
            </div>

            <h4 className="text-xl md:text-2xl font-semibold text-center mb-8">
              <CheckCircle className="inline h-6 w-6 mr-2 text-green-600 dark:text-green-400" />{" "}
              How We Help Healthcare Professionals:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {howItHelps.map((item, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow bg-card"
                >
                  <div className="flex items-center mb-3">
                    {item.icon}
                    <h5 className="ml-3 text-lg font-semibold">{item.title}</h5>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology Stack Section */}
        <section id="demo" className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <span className="inline-block bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                Powered by Amazon Web Services
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-3">
                Enterprise-Grade Healthcare Infrastructure
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                Built on AWS&apos;s HIPAA complaint services for maximum
                security, scalability, and reliability
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[
                {
                  icon: <Mic className="h-10 w-10 text-blue-500" />,
                  title: "Amazon Bedrock",
                  description:
                    "HIPAA compliant summaries for healthcare providers",
                },
                {
                  icon: <TranslateIcon className="h-10 w-10 text-green-500" />,
                  title: "Amazon Translate",
                  description:
                    "Real-time translation with medical terminology accuracy",
                },
                {
                  icon: <Volume2 className="h-10 w-10 text-purple-500" />,
                  title: "Amazon Polly",
                  description:
                    "Natural text-to-speech in multiple languages and voices",
                },
                {
                  icon: <SecurityIcon className="h-10 w-10 text-red-500" />,
                  title: "AWS Security",
                  description:
                    "End-to-end encryption with comprehensive audit trails",
                },
              ].map((tech, index) => (
                <div
                  key={index}
                  className="text-center flex flex-col items-center shadow-lg hover:shadow-xl transition-shadow bg-card rounded-lg p-6"
                >
                  <div className="mb-4 p-3 rounded-full bg-slate-100 dark:bg-slate-700">
                    {tech.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">
                    {tech.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {tech.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Languages We Support Section */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-semibold mb-3">
                <Globe className="inline h-7 w-7 mr-2 text-primary" />
                Languages We Support
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                Our platform is designed for global accessibility, understanding
                a wide array of languages and dialects.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-3 text-sm">
              {supportedLanguagesList.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center p-2 bg-card dark:bg-card rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow"
                >
                  <span
                    className="text-xl mr-2"
                    role="img"
                    aria-label={`${lang.name} flag`}
                  >
                    {getFlagEmoji(lang.displayCode)}
                  </span>
                  <span className="truncate" title={lang.name}>
                    {lang.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400">
              And more are being added continuously!
            </p>
          </div>
        </section>

        {/* Doctor Testimonials Section */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-3">
                🩺 Trusted By Healthcare Professionals
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                See how HealthReach is transforming patient care across diverse
                communities and cultures around the world.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex flex-col shadow-lg bg-card rounded-lg p-6"
                >
                  <div className="flex justify-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-yellow-400"
                      />
                    ))}
                  </div>
                  <div className="flex-grow">
                    <p className="text-slate-600 dark:text-slate-300 italic mb-4 text-center">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center pt-4 border-t">
                    <UserCircle2 className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {testimonial.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision/Closing Section */}
        <section
          id="contact"
          className="py-16 md:py-24 text-center bg-background"
        >
          <div className="container mx-auto px-4">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              The Future of Healthcare is Inclusive.
            </h3>
            <p className="text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto mb-6">
              Whether you&apos;re a doctor, patient, or caregiver, our platform
              ensures everyone stays informed, supported, and safe.
            </p>
            <p className="text-2xl font-semibold text-primary mb-8">
              No more guesswork. No more gaps. Just clarity.
            </p>
            <Link
              href="/transcribe"
              className="inline-flex items-center px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-medium rounded-md transition-colors mb-6"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
              Accessible Healthcare. Whenever, Wherever.
            </p>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center border-t bg-background">
        <div className="container mx-auto px-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Health Reach. All rights reserved.
            <br />
            This is a demonstration project for the SuperAI Next Hackathon.
          </p>
        </div>
      </footer>
    </div>
  );
}
