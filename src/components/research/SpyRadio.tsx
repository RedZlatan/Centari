"use client";

import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import styles from "./SpyRadio.module.css";

type SpyRadioProps = {
  onClose: () => void;
  frequency?: string;
  stationName?: string;
};

const defaultStreamUrl = "http://stream.uvb-76.net:8000/uvb76.mp3";

export function SpyRadio({
  onClose,
  frequency = "4625.00 kHz",
  stationName = "UVB-76 / THE BUZZER",
}: SpyRadioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<"standby" | "live" | "lost">("standby");

  async function togglePlayback() {
    const audio = audioRef.current;

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
          <strong>{stationName}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close spy radio">
          Close
        </button>
      </div>

      <div className={styles.receiver}>
        <div className={styles.frequency}>
          <span>Frequency</span>
          <strong>{frequency}</strong>
        </div>
        <div className={styles.status} data-status={status}>
          {status === "live" ? "Signal live" : null}
          {status === "standby" ? "Receiver standby" : null}
          {status === "lost" ? "Signal lost" : null}
        </div>
      </div>

      <div className={styles.scope} data-active={status === "live"}>
        {Array.from({ length: 28 }, (_, index) => (
          <span key={index} style={{ "--bar-index": index } as CSSProperties} />
        ))}
      </div>

      <p>
        Live open shortwave stream for UVB-76. If the stream fails in production,
        the browser is probably blocking the non-HTTPS radio source.
      </p>

      <div className={styles.actions}>
        <button type="button" onClick={togglePlayback}>
          {status === "live" ? "Pause signal" : "Open channel"}
        </button>
        <audio
          ref={audioRef}
          src={defaultStreamUrl}
          preload="none"
          onError={() => setStatus("lost")}
          onPause={() => setStatus((current) => current === "lost" ? "lost" : "standby")}
          onPlaying={() => setStatus("live")}
        />
      </div>
    </div>
  );
}
