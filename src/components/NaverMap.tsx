"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { MapPin } from "lucide-react";

interface NaverMapProps {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  className?: string;
}

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          el: HTMLElement,
          options: { center: unknown; zoom: number }
        ) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: {
          position: unknown;
          map: unknown;
          title?: string;
        }) => unknown;
        InfoWindow: new (options: { content: string }) => {
          open: (map: unknown, marker: unknown) => void;
        };
        Event: {
          addListener: (
            instance: unknown,
            event: string,
            handler: () => void
          ) => void;
        };
      };
    };
  }
}

export default function NaverMap({
  lat,
  lng,
  label,
  zoom = 16,
  className,
}: NaverMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  useEffect(() => {
    if (!scriptLoaded) return;
    if (!ref.current) return;
    if (!window.naver?.maps) return;

    const { naver } = window;
    const center = new naver.maps.LatLng(lat, lng);
    const map = new naver.maps.Map(ref.current, { center, zoom });
    const marker = new naver.maps.Marker({
      position: center,
      map,
      title: label,
    });

    if (label) {
      const infoWindow = new naver.maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:12px;color:#3B342F;">${label}</div>`,
      });
      naver.maps.Event.addListener(marker, "click", () => {
        infoWindow.open(map, marker);
      });
      infoWindow.open(map, marker);
    }
  }, [scriptLoaded, lat, lng, label, zoom]);

  if (!clientId) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EFE7DA] to-[#3B342F]/40 ${className ?? ""}`}
      >
        <MapPin className="h-10 w-10 text-[#B98768]" />
        <p className="text-xs text-[#9b9189]">
          NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 미설정
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onReady={() => setScriptLoaded(true)}
      />
      <div ref={ref} className={className} />
    </>
  );
}
