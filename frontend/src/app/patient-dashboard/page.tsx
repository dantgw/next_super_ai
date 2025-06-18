"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Navigation } from "../../components/Navigation";
import Image from "next/image";
import ConsultationSummaryCard from "../../components/ConsultationSummaryCard";

export default function PatientDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetchSummaries = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        const userEmail = data.user.email;
        console.log("useremail", userEmail);
        // Fetch summaries for this email, latest first
        const { data: summariesData, error } = await supabase
          .from("summaries")
          .select("*")
          .ilike("email", userEmail?.trim() ?? "")
          .order("created_at", { ascending: false });
        if (error) {
          console.log("sb error", error);
        }
        console.log(summariesData);
        if (!error) setSummaries(summariesData || []);
        setLoading(false);
      }
    };
    checkAuthAndFetchSummaries();
  }, [router]);

  if (loading) return null;

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
          <h1 className="text-3xl text-center font-bold text-gray-900 mb-4">
            Patient Dashboard
          </h1>

          <div className="space-y-8">
            {summaries.length === 0 ? (
              <p className="text-gray-500">No consultation summaries found.</p>
            ) : (
              summaries.map((summary) => (
                <ConsultationSummaryCard
                  key={summary.id}
                  summary={summary.summary_text}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
