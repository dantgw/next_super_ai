"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-4">
      <Link
        href="/transcribe"
        className={cn(
          "font-medium transition-colors",
          pathname === "/transcribe"
            ? "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
        )}
      >
        Transcription
      </Link>
      <Link
        href="/summarize"
        className={cn(
          "font-medium transition-colors",
          pathname === "/summarize"
            ? "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
        )}
      >
        Summarization
      </Link>
    </nav>
  );
}
