import { Navigation } from "../../components/Navigation";
import { Summarization } from "../../components/Summarization";

export default function SummarizePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Medical Summary
            </h1>
            <Navigation />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Summarization />
      </main>
    </div>
  );
}
