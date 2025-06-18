import { Navigation } from "../../components/Navigation";
import Image from "next/image";

export default function PatientDashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow">
        <div className="max-w-7xl h-20 mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex h-full justify-between items-center">
            <div className="relative">
              <Image
                src="/health-reach-logo.png"
                alt="Health Reach Logo"
                height={48}
                width={200}
                priority
                className="object-contain"
              />
            </div>
            <Navigation />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to your Patient Dashboard
          </h1>
          <p className="text-lg text-gray-700">
            Here you can view your medical transcripts, summaries, and more
            features coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
