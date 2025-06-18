"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Transcription } from "../../components/Transcription";
import { Navigation } from "../../components/Navigation";
import Image from "next/image";
import Link from "next/link";

export default function TranscribePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow">
        <div className="max-w-7xl h-20 mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex h-full justify-between items-center">
            <div className=" relative">
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
            </div>
            <Navigation />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Transcription />
        </div>
      </main>
    </div>
  );
}
