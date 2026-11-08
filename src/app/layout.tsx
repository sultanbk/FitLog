import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitLog",
  description: "Your personal health goals, in one calm place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
