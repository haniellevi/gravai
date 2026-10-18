"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { COVER_STYLES, type CoverStyleId } from "@/lib/ai/agents/capas-guia";
import { notifyCost } from "@/lib/ai/cost-events";
import type { CoverOption } from "@/lib/interview/steps";
import { regenerateCovers } from "@/lib/script/actions";
import styles from "./script.module.css";

const styleLabel = (type: string) => COVER_STYLES[type as CoverStyleId]?.label ?? "Capa";

/** As 3 opções do agente de capas (a melhor primeiro), prontas para colar no ChatGPT. Sem opções, mostra o prompt antigo. */
export function CoverOptions({
  options,
  legacyPrompt,
  projectId,
  cutId,
  compact = false,
  onRegenerated,
}: {
  options: CoverOption[];
  legacyPrompt: string | null;
  projectId: string;
  /** Capa de um corte; sem isto, é a capa do vídeo todo. */
  cutId?: string;
  compact?: boolean;
  /** Avisa quem guarda a lista (os cortes) depois de refazer; o servidor já gravou. */
  onRegenerated?: (options: CoverOption[]) => void;
}) {
  const [local, setLocal] = useState<CoverOption[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Quando quem guarda a lista troca as opções (nova sugestão de cortes), valem as de lá.
  useEffect(() => setLocal(null), [options]);
  const shown = local ?? options;

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      // Sem permissão de área de transferência: o prompt continua na tela, em "Ver prompt".
    }
  }

  async function redo() {
    setBusy(true);
    setError(null);
    try {
      const r = await regenerateCovers(projectId, cutId);
      notifyCost();
      if ("error" in r) setError(r.error);
      else {
        setLocal(r.options);
        onRegenerated?.(r.options);
      }
    } catch {
      setError("Não foi possível refazer as capas agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (shown.length === 0) {
    if (!legacyPrompt) return null;
    return (
      <div className={styles.infoCard}>
        <div className={styles.infoHead}>
          <span className={styles.infoLabel}>Capa (prompt para IA)</span>
          <button type="button" className={styles.iconBtn} aria-label="Copiar: Capa (prompt para IA)" onClick={() => void copy("antigo", legacyPrompt)}>
            {copied === "antigo" ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          </button>
        </div>
        <p className={styles.infoText}>{legacyPrompt}</p>
      </div>
    );
  }

  return (
    <div className={compact ? styles.coverBoxCompact : styles.coverBox}>
      <p className={styles.coverHint}>Abra o ChatGPT, anexe a sua foto e cole o prompt. A sua foto será a Imagem 1.</p>
      <ul className={styles.infoList}>
        {shown.map((o, k) => {
          const label = styleLabel(o.type);
          const key = `${o.type}-${k}`;
          return (
            <li key={key} className={styles.infoCard}>
              <div className={styles.infoHead}>
                <span className={styles.infoLabel}>
                  {label}
                  {o.best ? <span className={styles.coverBest}>Melhor</span> : null}
                </span>
                <button type="button" className={styles.iconBtn} aria-label={`Copiar prompt da capa: ${label}`} onClick={() => void copy(key, o.prompt)}>
                  {copied === key ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
                </button>
              </div>
              <p className={styles.coverWords}>
                Texto na capa: <b>{o.words}</b>
              </p>
              <p className={styles.coverWhy}>{o.why}</p>
              <details className={styles.cutMore}>
                <summary>Ver prompt</summary>
                <p className={styles.infoText}>{o.prompt}</p>
              </details>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className={styles.coverError}>
          {error}
        </p>
      ) : null}
      <Button variant="soft" icon={Sparkles} onClick={() => void redo()} disabled={busy}>
        {busy ? "Refazendo…" : "Refazer capas"}
      </Button>
    </div>
  );
}
