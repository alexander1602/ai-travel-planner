// components/common/Settings.tsx
"use client";

import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Modal } from "./Modal";

interface SettingsProps {
  isAIConfigured: boolean;
  activeProvider: string;
}

export function Settings({ isAIConfigured, activeProvider }: SettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Apri impostazioni"
        onClick={() => setOpen(true)}
        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <SettingsIcon className="h-4 w-4" />
      </button>

      <Modal title="Impostazioni AI" open={open} onOpenChange={setOpen}>
        <div className="space-y-3 text-sm">
          <p>
            Provider attivo: <span className="font-medium">{activeProvider}</span>
          </p>
          {!isAIConfigured && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Nessuna chiave API configurata. L&apos;app sta usando dati demo. Imposta{" "}
              <code>OPENAI_API_KEY</code> o <code>GEMINI_API_KEY</code> in{" "}
              <code>.env.local</code> per usare l&apos;AI reale.
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
