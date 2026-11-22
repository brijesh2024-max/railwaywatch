import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Railwatch | Track inspection",
  description: "NIT Srinagar railway UAV ground monitoring station",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
