"use client";

import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import styles from "./SpyRadio.module.css";

type SpyRadioProps = {
  onClose: () => void;
  station: SpyRadioStation;
};

export type SpyRadioStation = {
  id: string;
  stationName: string;
  codename: string;
  frequency: string;
  location: string;
  status: "live" | "active" | "scheduled";
  streamUrl?: string;
  notes: string;
};

export function SpyRadio({
  onClose,
  station,
}: SpyRadioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<"standby" | "live" | "lost">("standby");

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!station.streamUrl) {
      setStatus("lost");
      return;
    }

    if (!audio) {
      return;
    }

    if (!audio.paused) {
      audio.pause();
      setStatus("standby");
      return;
    }

    try {
      await audio.play();
      setStatus("live");
    } catch {
      setStatus("lost");
    }
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Spy radio receiver">
      <div className={styles.header}>
        <div>
          <span>Shortwave intercept</span>
          <strong>{station.stationName}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close spy radio">
          Close
        </button>
      </div>

      <div className={styles.receiver}>
        <div className={styles.frequency}>
          <span>Frequency</span>
          <strong>{station.frequency}</strong>
        </div>
        <div className={styles.status} data-status={status}>
          {status === "live" ? "Signal live" : null}
          {status === "standby" ? "Receiver standby" : null}
          {status === "lost" ? "Signal lost" : null}
        </div>
      </div>

      <div className={styles.stationMeta}>
        <span>{station.codename}</span>
        <span>{station.location}</span>
        <span>{station.status}</span>
      </div>

      <div className={styles.scope} data-active={status === "live"}>
        {Array.from({ length: 28 }, (_, index) => (
          <span key={index} style={{ "--bar-index": index } as CSSProperties} />
        ))}
      </div>

      <p>
        {station.notes}
        {station.streamUrl
          ? " If the stream fails in production, the browser is probably blocking the non-HTTPS radio source."
          : " This is a real monitored signal, but no stable direct web audio stream is attached yet."}
      </p>

      <div className={styles.actions}>
        <button type="button" onClick={togglePlayback}>
          {status === "live" ? "Pause signal" : station.streamUrl ? "Open channel" : "No stream"}
        </button>
        {station.streamUrl ? (
          <audio
            ref={audioRef}
            src={station.streamUrl}
            preload="none"
            onError={() => setStatus("lost")}
            onPause={() => setStatus((current) => current === "lost" ? "lost" : "standby")}
            onPlaying={() => setStatus("live")}
          />
        ) : null}
      </div>
    </div>
  );
}
