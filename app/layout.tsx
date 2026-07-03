import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FridgeChef",
  description: "Turn your fridge's ingredients into recipe ideas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
