"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { toast } from "sonner";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      // Show success message and redirect to login
      toast.success("Please check your email to confirm your account");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during sign up"
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4">
            <Link href={"/"}>
              <Image
                src="/health-reach-logo.png"
                alt="Health Reach Logo"
                width={300}
                height={100}
                priority
              />
            </Link>
          </div>
          <h2 className="mt-8 text-center text-2xl text-gray-600">
            Create your account
          </h2>
        </div>

        {/* Sign Up Form */}
        <div className="mt-8 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">Sign Up</h3>
          <p className="text-gray-600 mb-6">
            Enter your details to create a new account.
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#000066] hover:bg-[#000088] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#000066]"
            >
              <span>Sign Up</span>
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-600 text-center">
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Already have an account? Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
