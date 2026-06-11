import { Suspense } from 'react';
import { Radio, ShieldCheck } from 'lucide-react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="bg-abyss text-foam grid min-h-svh lg:grid-cols-[440px_minmax(0,1fr)]">
      <section className="flex items-center px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="space-y-5">
            <div className="border-signal/50 bg-signal/10 relative grid size-11 place-items-center rounded-sm border">
              <Radio className="text-signal-bright size-5" />
              <span className="sonar-ping absolute size-11" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold">SIREN</h1>
              <p className="text-mist-t text-sm">
                Spatial Intelligence for Illegal Fishing Response
              </p>
            </div>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <div className="border-fog flex items-center gap-2 border-t pt-5 text-xs text-fathom">
            <ShieldCheck className="size-4 text-territory" />
            <span>Multi-agency maritime enforcement console</span>
          </div>
        </div>
      </section>

      <section className="border-fog bg-trench relative hidden overflow-hidden border-l lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(34_211_238_/_0.07)_1px,transparent_1px),linear-gradient(rgb(34_211_238_/_0.07)_1px,transparent_1px)] bg-[size:88px_88px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_42%,rgb(139_92_246_/_0.16),transparent_30%)]" />
        <div className="absolute left-[17%] top-[23%] h-40 w-72 rotate-[-16deg] rounded-[45%] border border-territory/45 bg-territory/5" />
        <div className="absolute right-[16%] top-[42%] h-52 w-80 rotate-[13deg] rounded-[44%] border border-territory/35 bg-territory/5" />
        <div className="absolute bottom-[16%] left-[35%] h-44 w-72 rotate-[24deg] rounded-[45%] border border-territory/30 bg-territory/5" />

        <div className="absolute left-[45%] top-[41%]">
          <span className="block size-3 rounded-full bg-sev-critical shadow-[0_0_24px_var(--sev-critical)]" />
          <span className="sonar-ping absolute -left-5 -top-5 size-14" />
          <span className="sonar-ping absolute -left-8 -top-8 size-20 [animation-delay:180ms]" />
        </div>

        <div className="bg-trench/90 border-mist absolute bottom-8 left-8 w-80 rounded-sm border p-4">
          <div className="font-data text-fathom text-[0.6875rem] uppercase">Live Detection</div>
          <div className="mt-2 font-display text-xl font-semibold">WPP-711</div>
          <p className="text-mist-t mt-2 text-sm">
            Vessel anomaly detected near territorial boundary.
          </p>
        </div>
      </section>
    </main>
  );
}
