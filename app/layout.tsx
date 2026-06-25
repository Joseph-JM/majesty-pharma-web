import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { BusinessProvider } from "@/components/BusinessProvider";

export const metadata: Metadata = {
  title: "Majesty Pharma ERP",
  description: "Majesty Pharma ERP for sales, inventory, customer management, and approvals.",
  icons: {
    icon: "/majesty-pharma-web/majesty-pharma-icon.svg",
    shortcut: "/majesty-pharma-web/majesty-pharma-icon.svg",
    apple: "/majesty-pharma-web/majesty-pharma-icon.svg",
  },
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
