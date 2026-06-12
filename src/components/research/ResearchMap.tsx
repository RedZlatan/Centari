"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Signal } from "@/lib/signals";
import { DOMAIN_COLORS } from "@/lib/signals";
import styles from "./ResearchMap.module.css";

interface Props {
  signals: Signal[];
  highlightedSignalIds: string[] | null;
  onSignalClick: (signalId: string) => void;
  onSignalHover: (data: { signalId: string; x: number; y: number } | null) => void;
}

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
      id: string;
      title: string;
      primary_domain: string;
      signal_type: string;
      location_label: string;
      published_at: string;
      curator_score: number;
      source_name: string;
      color: string;
    };
  }>;
};

function toGeoJSON(signals: Signal[]): GeoJSONFeatureCollection {
  return {
    type: "FeatureCollection",
    features: signals.map((s) => ({
      type: "Feature",
      id: s.id,
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        title: s.title,
        primary_domain: s.primary_domain,
        signal_type: s.signal_type,
        location_label: s.location_label,
        published_at: s.published_at,
        curator_score: s.curator_score,
        source_name: s.source_name,
        color: DOMAIN_COLORS[s.primary_domain],
      },
    })),
  };
}

const MAP_STYLE = process.env.NEXT_PUBLIC_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
  : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function ResearchMap({
  signals,
  highlightedSignalIds,
  onSignalClick,
  onSignalHover,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const callbacksRef = useRef({ onSignalClick, onSignalHover });
  const [mapLoaded, setMapLoaded] = useState(false);

  // Keep callbacks ref current so event handlers never go stale
  useEffect(() => {
    callbacksRef.current = { onSignalClick, onSignalHover };
  });

  // Init map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [15, 28],
      zoom: 1.7,
      minZoom: 1,
      maxZoom: 14,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      // ── Sources ────────────────────────────────────────────────────────────
      map.addSource("signals", {
        type: "geojson",
        data: toGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 5,
        clusterRadius: 48,
      });

      // ── Layers (rendered bottom → top) ────────────────────────────────────

      // Cluster glow ring
      map.addLayer({
        id: "cluster-glow",
        type: "circle",
        source: "signals",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#A88A5A",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            36, 5, 44, 10, 52,
          ],
          "circle-blur": 1.0,
          "circle-opacity": 0.22,
        },
      });

      // Cluster solid circle
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "signals",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#A88A5A",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18, 5, 24, 10, 30,
          ],
          "circle-opacity": 0.88,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.18)",
        },
      });

      // Cluster count label
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "signals",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#17191A",
        },
      });

      // Individual signal dots
      map.addLayer({
        id: "signals-points",
        type: "circle",
        source: "signals",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 6,
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.12)",
        },
      });

      // Hover highlight layer (filtered to hovered signal only)
      map.addLayer({
        id: "signals-hover",
        type: "circle",
        source: "signals",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 9,
          "circle-opacity": 1.0,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.75)",
        },
      });

      // Trend highlight layer (filtered to highlighted signal IDs)
      map.addLayer({
        id: "signals-highlight",
        type: "circle",
        source: "signals",
        filter: ["in", ["get", "id"], ["literal", []]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 10,
          "circle-opacity": 1.0,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#E9E5DF",
        },
      });

      // ── Cursor ─────────────────────────────────────────────────────────────
      map.on("mouseenter", "signals-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "signals-points", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });

      // ── Hover tooltip ──────────────────────────────────────────────────────
      map.on("mousemove", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["signals-points"],
        });
        if (features.length > 0) {
          const props = features[0].properties as { id: string };
          map.setFilter("signals-hover", [
            "==",
            ["get", "id"],
            props.id,
          ]);
          callbacksRef.current.onSignalHover({
            signalId: props.id,
            x: e.point.x,
            y: e.point.y,
          });
        } else {
          map.setFilter("signals-hover", ["==", ["get", "id"], ""]);
          callbacksRef.current.onSignalHover(null);
        }
      });

      // ── Signal click ───────────────────────────────────────────────────────
      map.on("click", "signals-points", (e) => {
        const props = e.features?.[0]?.properties as { id: string } | undefined;
        if (props) {
          callbacksRef.current.onSignalClick(props.id);
        }
      });

      // ── Cluster click → zoom in ────────────────────────────────────────────
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        if (!features[0]) return;
        const clusterId = features[0].properties.cluster_id as number;
        const source = map.getSource("signals") as maplibregl.GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            const coords = (
              features[0].geometry as GeoJSON.Point
            ).coordinates as [number, number];
            map.easeTo({ center: coords, zoom: zoom ?? 6 });
          })
          .catch(() => {});
      });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON when filtered signals change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource(
      "signals"
    ) as maplibregl.GeoJSONSource | undefined;
    source?.setData(toGeoJSON(signals) as Parameters<typeof source.setData>[0]);
  }, [signals, mapLoaded]);

  // Update trend highlight layer
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const ids = highlightedSignalIds ?? [];
    mapRef.current.setFilter("signals-highlight", [
      "in",
      ["get", "id"],
      ["literal", ids],
    ]);
  }, [highlightedSignalIds, mapLoaded]);

  return <div ref={containerRef} className={styles.map} />;
}
