import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/Providers";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "TestGen Studio - Build smarter test cases and automation scripts with AI",
  description: "Build smarter test cases and automation scripts with AI.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read session server-side so the client provider has it immediately (no /api/auth/session round-trip on mount)
  const session = await auth();
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Providers session={session}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "10px",
              background: "#fff",
              color: "#1e293b",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
              fontSize: "14px",
            },
          }}
        />
        {children}
        </Providers>
      </body>
    </html>
  );
}
