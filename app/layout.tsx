import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { BusinessProvider } from "@/components/BusinessProvider";

export const metadata: Metadata = {
  title: "Minimal RBAC Admin",
  description: "Minimal and professional Next.js RBAC starter",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <BusinessProvider>{children}</BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
