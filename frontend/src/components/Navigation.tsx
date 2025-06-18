"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to section by id
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle nav click: if on home, scroll; else, go home then scroll
  const handleNavClick = (sectionId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") {
      scrollToSection(sectionId);
    } else {
      router.push(`/#${sectionId}`);
    }
  };

  useEffect(() => {
    // Fetch user on mount
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    getUser();
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDropdownOpen(false);
    router.push("/");
  };

  return (
    <nav className="space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 flex items-center relative">
      {pathname === "/" && (
        <>
          <Link
            href="/"
            className="text-xs sm:text-sm font-medium text-primary"
          >
            Home
          </Link>
          <a
            href="#about"
            className="text-xs sm:text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
            onClick={handleNavClick("about")}
          >
            About Us
          </a>
          <a
            href="#faq"
            className="text-xs sm:text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
            onClick={handleNavClick("faq")}
          >
            FAQ
          </a>
          <a
            href="#demo"
            className="text-xs sm:text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
            onClick={handleNavClick("demo")}
          >
            Demo
          </a>
          <a
            href="#contact"
            className="text-xs sm:text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
            onClick={handleNavClick("contact")}
          >
            Contact Us
          </a>
        </>
      )}
      {!user ? (
        <Link
          href="/login"
          className="text-xs sm:text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
        >
          Login
        </Link>
      ) : (
        <div className="ml-4 relative" ref={dropdownRef}>
          <button
            className="focus:outline-none"
            onClick={() => setDropdownOpen((open) => !open)}
            aria-label="Open profile menu"
          >
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-gray-100 text-gray-600 shadow-sm">
              <UserIcon className="w-6 h-6" />
            </span>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="px-4 py-2 text-sm text-gray-700 truncate border-b border-gray-100">
                {user.email}
              </div>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
