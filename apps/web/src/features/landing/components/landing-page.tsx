import Image from "next/image"
import Link from "next/link"
import { Bot, FileText, Map, Network, Radar } from "lucide-react"

const FEATURES = [
  {
    title: "Peta Command Center",
    body: "Mapbox dark console untuk WPP, ZEE, MPA, heatmap, cluster, dan track kapal.",
    icon: Map,
  },
  {
    title: "5-rule Alert Engine",
    body: "Zone violation, AIS gap, loitering MPA, suspicious encounter, dan behavior mismatch.",
    icon: Radar,
  },
  {
    title: "AI Assistant + Citations",
    body: "Jawaban hukum maritim dengan rujukan pasal yang bisa dibuka di panel kerja.",
    icon: Bot,
  },
  {
    title: "Evidence PDF",
    body: "Kronologi, peta statis, analisis SIREN, citations, dan blok tanda tangan.",
    icon: FileText,
  },
  {
    title: "Multi-agency Dispatch",
    body: "Scope agency, handoff, case workflow, dan audit trail untuk akuntabilitas.",
    icon: Network,
  },
]

const AGENCIES = ["PSDKP", "BAKAMLA", "KKP", "POLRI", "TNI AL"]

export function LandingPage() {
  return (
    <main className="bg-abyss text-foam relative isolate min-h-svh overflow-hidden">
      <Image
        src="/landing/dashboard-preview.png"
        alt="Tampilan dashboard SIREN dengan peta kapal dan alert feed"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-28"
      />
      <div className="absolute inset-0 bg-abyss/82" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-trench/60" />

      <div className="relative z-10 flex min-h-svh flex-col px-4 py-4 sm:px-8 sm:py-5 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="border-signal/50 bg-signal/10 relative grid size-9 place-items-center rounded-sm border">
              <span className="bg-signal size-2 rounded-full" />
              <span className="sonar-ping absolute size-9" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold leading-none">SIREN</p>
              <p className="font-data text-fathom text-[0.65rem] uppercase">Maritime Enforcement OS</p>
            </div>
          </div>
          <Link
            href="/login"
            className="bg-signal text-abyss hover:bg-signal-bright inline-flex h-10 items-center justify-center rounded-sm px-4 text-sm font-semibold transition-colors"
          >
            Masuk
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-6 py-5 sm:gap-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:py-10">
          <div className="max-w-4xl">
            <p className="font-data text-territory mb-4 text-xs uppercase tracking-[0.18em]">
              Illegal fishing response - multi-agency command
            </p>
            <h1 className="font-display max-w-4xl text-5xl font-semibold leading-[0.95] sm:text-6xl lg:text-7xl">
              SIREN
            </h1>
            <p className="text-mist-t mt-4 max-w-2xl text-sm leading-6 sm:mt-5 sm:text-lg sm:leading-7">
              Sistem intelijen spasial untuk deteksi illegal fishing, routing kewenangan, dan penyusunan bukti
              hukum. Operator melihat laut sebagai command surface: peta, alert, case, AI legal assistant, dan
              evidence PDF dalam satu alur kerja.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 sm:mt-7">
              <Link
                href="/login"
                className="bg-signal text-abyss hover:bg-signal-bright inline-flex h-11 items-center justify-center rounded-sm px-5 text-sm font-semibold transition-colors"
              >
                Masuk ke Dashboard
              </Link>
            </div>
          </div>

          <div className="border-fog bg-abyss/72 shadow-signal/10 hidden max-w-[440px] justify-self-end overflow-hidden rounded-sm border shadow-2xl lg:block">
            <Image
              src="/landing/hero-illustration.png"
              alt="Ilustrasi peta maritim Indonesia SIREN"
              width={1254}
              height={1254}
              sizes="(min-width: 1024px) 440px, 100vw"
              className="aspect-square w-full object-cover"
              priority
            />
          </div>
        </section>

        <section id="kapabilitas" className="border-fog border-t pt-3 sm:pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-data text-fathom text-xs uppercase">Kapabilitas P0/P1</p>
            <div className="flex flex-wrap gap-1.5">
              {AGENCIES.map((agency) => (
                <span
                  key={agency}
                  className="border-territory/35 bg-territory/10 text-territory rounded-sm border px-2 py-1 font-data text-[0.65rem] uppercase"
                >
                  {agency}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <article key={feature.title} className="border-fog bg-trench/80 rounded-sm border p-2.5 sm:p-3">
                  <div className="flex items-center gap-2 sm:mb-3">
                    <Icon className="text-signal-bright size-4" />
                    <h2 className="text-foam text-sm font-semibold">{feature.title}</h2>
                  </div>
                  <p className="text-mist-t hidden text-xs leading-5 sm:block">{feature.body}</p>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
