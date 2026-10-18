"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { PLATFORM_LABELS, PLATFORMS, type CoverOption, type Platform } from "@/lib/interview/steps";
import { CoverOptions } from "./CoverOptions";
import styles from "./script.module.css";

export type MainInfo = { coverPrompt: string | null; covers?: CoverOption[]; descriptions: Partial<Record<Platform, string>> };

/** Capa e descrição de cada plataforma do vídeo principal, prontas para copiar. */
export function VideoInfo({ info, projectId }: { info: MainInfo; projectId: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const hasCover = Boolean(info.covers?.length || info.coverPrompt);
  const items = [
    ...PLATFORMS.flatMap((p) => (info.descriptions[p] ? [{ key: p, label: `Descrição · ${PLATFORM_LABELS[p]}`, text: info.descriptions[p] as string }] : [])),
  ];
  if (items.length === 0 && !hasCover) return null;

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      // Sem permissão de área de transferência: o texto continua na tela para copiar à mão.
    }
  }

  return (
    <section className={styles.cuts} aria-labelledby="info-titulo">
      <h2 id="info-titulo" className={styles.cutsTitle}>
        Capa e descrições
      </h2>
      <p className={styles.cutsLead}>Prontas para colar ao publicar o vídeo.</p>
      {hasCover ? <CoverOptions options={info.covers ?? []} legacyPrompt={info.coverPrompt} projectId={projectId} /> : null}
      <ul className={styles.infoList}>
        {items.map((it) => (
          <li key={it.key} className={styles.infoCard}>
            <div className={styles.infoHead}>
              <span className={styles.infoLabel}>{it.label}</span>
              <button type="button" className={styles.iconBtn} aria-label={`Copiar: ${it.label}`} onClick={() => void copy(it.key, it.text)}>
                {copied === it.key ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
              </button>
            </div>
            <p className={styles.infoText}>{it.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
