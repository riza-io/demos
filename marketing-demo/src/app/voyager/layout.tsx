import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riza Voyager",
  description: "Riza Voyager",
};

export default function VoyagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
