import { Navigation } from "../../components/Navigation";

export default function SummarizePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Medical Summary
            </h1>
            <Navigation />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Upload a transcription or paste text to generate a medical
              summary.
            </p>
            {/* Placeholder for future summarization functionality */}
            <div className="space-y-4">
              <textarea
                className="w-full h-32 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Paste your medical transcription here..."
              />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => alert("Summarization feature coming soon!")}
              >
                Generate Summary
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
