import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Header from "../../components/common/Header";
import { navigateBack } from "../../utils/navigateBack";

type SubPageItem = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

type SettingsSubPageProps = {
  title: string;
  description?: string;
  items: SubPageItem[];
};

export default function SettingsSubPage({ title, description, items }: SettingsSubPageProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "BitGlow";
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      <Header
        leftContent={
          <button
            type="button"
            onClick={() => navigateBack(navigate, "/settings")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      />
      <main className="mx-auto h-[calc(100dvh-64px)] w-full max-w-2xl overflow-y-auto px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 custom-scrollbar sm:px-6 md:pb-10">
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          {description ? <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p> : null}
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex min-h-[64px] items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-white">{item.title}</div>
                {item.subtitle ? <div className="mt-0.5 text-xs text-zinc-400">{item.subtitle}</div> : null}
              </div>
              {item.action ?? <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" />}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
