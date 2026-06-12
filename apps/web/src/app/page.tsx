import type { Metadata } from "next"
import { LandingPage } from "@/features/landing/components/landing-page"

export const metadata: Metadata = {
  title: "SIREN - Spatial Intelligence for Illegal Fishing Response",
  description:
    "Command center multi-agency untuk deteksi illegal fishing, AI legal assistant, dispatch kasus, dan evidence PDF.",
  openGraph: {
    title: "SIREN",
    description:
      "Spatial Intelligence for Illegal Fishing Response - peta, alert engine, AI citations, dan evidence workflow.",
    type: "website",
  },
}

export default function Home() {
  return <LandingPage />
}
