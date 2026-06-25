"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useBusiness } from "@/components/BusinessProvider";
import { formatNumber, getLocationLabelFromCode } from "@/lib/business";
import { getUserLocationCode } from "@/lib/auth";
import { getShipmentLineTotal, type WarehouseShipment } from "@/lib/warehouse";

// ---------------------------------------------------------------------------
// BarcodeDetector Web API type declarations (no package needed)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Step tracker
// ---------------------------------------------------------------------------

const checkingSteps = ["Start Checking", "Scan & Verify", "Confirm Qty", "Move to Packing"];

function StepBadge({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {checkingSteps.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-red text-white" : "bg-zinc-100 text-zinc-400"
            }`}
          >
            {i < step ? "✓" : i + 1}
          </span>
          <span className={`hidden text-xs font-medium lg:block ${i === step ? "text-zinc-950" : "text-brand-gray"}`}>
            {label}
          </span>
          {i < checkingSteps.length - 1 && <span className="text-zinc-200 text-xs mx-0.5">›</span>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Camera Scanner component
// ---------------------------------------------------------------------------

function CameraScanner({
  onScan,
  onClose,
}: {
  onScan: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const scanLoopRef = useRef<number>(0);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const [isSupported] = useState(() => typeof window === "undefined" || "BarcodeDetector" in window);
  const [isLoading, setIsLoading] = useState(() => typeof window === "undefined" || "BarcodeDetector" in window);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [flashSku, setFlashSku] = useState<string | null>(null);

  // Scan loop — runs per animation frame
  const startScanLoop = useCallback(() => {
    async function loop() {
      if (!videoRef.current || !detectorRef.current) return;
      if (videoRef.current.readyState < 4) {
        scanLoopRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const results = await detectorRef.current.detect(videoRef.current);
        if (results.length > 0) {
          const value = results[0].rawValue;
          const now = Date.now();
          // Debounce: same value within 2 s is ignored
          if (value !== lastScanRef.current || now - lastScanTimeRef.current > 2000) {
            lastScanRef.current = value;
            lastScanTimeRef.current = now;
            setFlashSku(value);
            onScan(value);
            setTimeout(() => setFlashSku(null), 1500);
          }
        }
      } catch { /* ignore decode errors */ }
      scanLoopRef.current = requestAnimationFrame(loop);
    }
    scanLoopRef.current = requestAnimationFrame(loop);
  }, [onScan]);

  function stopStream() {
    cancelAnimationFrame(scanLoopRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera(deviceId?: string) {
    stopStream();
    setIsLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          facingMode: deviceId ? undefined : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      // Enumerate devices after permission is granted (labels now available)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoDevices);

      const track = stream.getVideoTracks()[0];
      setActiveCameraId(track.getSettings().deviceId ?? "");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsLoading(false);
            startScanLoop();
          });
        };
      }
    } catch (err) {
      const name = (err as Error).name;
      setError(
        name === "NotAllowedError"
          ? "Camera access denied. Allow camera permissions in browser settings and try again."
          : "Could not start camera. Make sure a camera device is connected.",
      );
      setIsLoading(false);
    }
  }

  // Init: check API support then start camera
  useEffect(() => {
    if (!isSupported) return;
    detectorRef.current = new window.BarcodeDetector!({
      formats: ["code_128", "ean_13", "ean_8", "code_39", "qr_code", "data_matrix", "itf"],
    });
    let active = true;
    void Promise.resolve().then(() => { if (active) startCamera(); });
    return () => {
      active = false;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCameraSwitch(deviceId: string) {
    setActiveCameraId(deviceId);
    startCamera(deviceId);
  }

  if (!isSupported) {
    return (
      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Camera Scanning Not Supported</p>
        <p className="mt-1.5 text-sm text-amber-800">
          Your browser does not support the BarcodeDetector API. Use Chrome 88+, Edge 88+, or Safari 17.4+. Type the item SKU manually in the field above.
        </p>
        <button
          className="mt-3 text-xs font-semibold text-amber-700 underline"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-950">
      {/* Camera selector */}
      {cameras.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
          <select
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 outline-none"
            onChange={(e) => handleCameraSwitch(e.target.value)}
            value={activeCameraId}
          >
            {cameras.map((cam, i) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
          <button
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-100"
            onClick={onClose}
            type="button"
          >
            ✕ Close Camera
          </button>
        </div>
      )}

      {/* Video feed */}
      <div className="relative aspect-video w-full bg-zinc-950">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />

        {/* Loading overlay */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-brand-red" />
            <p className="text-sm text-zinc-400">Starting camera…</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-6">
            <div className="text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                className="mt-3 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
                onClick={() => startCamera()}
                type="button"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Scanning frame overlay */}
        {!isLoading && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-36 w-64 sm:h-44 sm:w-80">
              {/* Dimmed outside */}
              <div className="absolute -inset-[9999px] bg-zinc-950/50" />
              {/* Corner brackets */}
              {[
                "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
              ].map((cls, i) => (
                <span key={i} className={`absolute h-7 w-7 border-brand-red ${cls}`} />
              ))}
              {/* Animated scan line */}
              <div
                className="absolute inset-x-2 h-0.5 rounded-full bg-brand-red/90 shadow-[0_0_10px_2px_rgba(220,38,38,0.7)]"
                style={{ animation: "scanLine 1.8s ease-in-out infinite", top: "20%" }}
              />
            </div>
          </div>
        )}

        {/* Scan success flash */}
        {flashSku && (
          <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-xl bg-emerald-500/95 px-4 py-2.5 shadow-lg">
            <span className="text-lg">✓</span>
            <p className="text-sm font-semibold text-white">Scanned: {flashSku}</p>
          </div>
        )}
      </div>

      {/* Camera footer */}
      {cameras.length <= 1 && (
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-xs text-zinc-500">Point camera at a barcode</p>
          <button
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-100"
            onClick={onClose}
            type="button"
          >
            ✕ Close Camera
          </button>
        </div>
      )}

      {/* Inject scan line keyframe */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 20%; }
          50% { top: 75%; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active checking session
// ---------------------------------------------------------------------------

type LineVerification = { confirmedQty: string; verified: boolean };

function ActiveCheckingSession({
  shipment,
  onComplete,
  onCancel,
}: {
  shipment: WarehouseShipment;
  onComplete: (id: string) => void;
  onCancel: () => void;
}) {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const confirmedInputRef = useRef<HTMLInputElement>(null);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedSku, setScannedSku] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [lineVerifications, setLineVerifications] = useState<Record<string, LineVerification>>(() =>
    Object.fromEntries(
      shipment.lines.map((l) => [l.sku, { confirmedQty: String(l.pickedQty > 0 ? l.pickedQty : l.qty), verified: false }]),
    ),
  );

  const scannedLine = scannedSku ? shipment.lines.find((l) => l.sku === scannedSku) ?? null : null;
  const verifiedCount = Object.values(lineVerifications).filter((v) => v.verified).length;
  const allVerified = verifiedCount === shipment.lines.length;
  const currentStep = allVerified ? 3 : scannedSku ? 2 : 1;

  useEffect(() => { barcodeRef.current?.focus(); }, []);
  useEffect(() => {
    if (scannedSku && !showCamera) setTimeout(() => confirmedInputRef.current?.focus(), 60);
  }, [scannedSku, showCamera]);

  const processScan = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setScanError(null);
      const matched = shipment.lines.find(
        (l) => l.sku.toLowerCase() === trimmed.toLowerCase() || l.sku.toLowerCase().includes(trimmed.toLowerCase()),
      );
      if (!matched) {
        setScanError(`"${trimmed}" not found in this shipment.`);
        return;
      }
      if (lineVerifications[matched.sku]?.verified) {
        setScanError(`${matched.sku} is already verified.`);
        return;
      }
      setScannedSku(matched.sku);
    },
    [shipment.lines, lineVerifications],
  );

  function handleManualScan() {
    processScan(barcodeInput);
    setBarcodeInput("");
  }

  function handleCameraScan(value: string) {
    processScan(value);
    // Keep camera open — checker will manually confirm qty then scan next
  }

  function updateConfirmedQty(sku: string, value: string) {
    setLineVerifications((prev) => ({ ...prev, [sku]: { ...prev[sku], confirmedQty: value } }));
  }

  function markVerified(sku: string) {
    setLineVerifications((prev) => ({ ...prev, [sku]: { ...prev[sku], verified: true } }));
    setScannedSku(null);
    setScanError(null);
    setTimeout(() => barcodeRef.current?.focus(), 60);
  }

  function unverify(sku: string) {
    setLineVerifications((prev) => ({ ...prev, [sku]: { ...prev[sku], verified: false } }));
  }

  function selectLine(line: (typeof shipment.lines)[0]) {
    if (lineVerifications[line.sku]?.verified) return;
    setScannedSku(line.sku);
    if (!lineVerifications[line.sku]?.confirmedQty) {
      updateConfirmedQty(line.sku, String(line.pickedQty > 0 ? line.pickedQty : line.qty));
    }
    setScanError(null);
  }

  const confirmedQtyValue = scannedSku ? (lineVerifications[scannedSku]?.confirmedQty ?? "") : "";
  const confirmedQtyNum = Number(confirmedQtyValue);
  const confirmedQtyValid = confirmedQtyValue !== "" && !Number.isNaN(confirmedQtyNum) && confirmedQtyNum >= 0;
  const confirmedQtyOver = scannedLine != null && confirmedQtyValid && confirmedQtyNum > scannedLine.qty;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-zinc-950">{shipment.id}</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
              Checking in Progress
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-gray">
            {shipment.partyName} · {getLocationLabelFromCode(shipment.locationCode)} · {shipment.sourceId}
          </p>
          <p className="mt-0.5 text-xs text-brand-gray">
            Picked by <span className="font-medium text-zinc-950">{shipment.pickerName || "—"}</span> ·{" "}
            {formatNumber(getShipmentLineTotal(shipment))} units · {shipment.lines.length} line{shipment.lines.length === 1 ? "" : "s"}
          </p>
        </div>
        <StepBadge step={currentStep} />
      </div>

      {/* Barcode input */}
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">Barcode Scanner</p>
        <p className="mt-1 text-xs text-brand-gray">
          Use the camera or type an SKU and press{" "}
          <kbd className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">Enter</kbd>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-brand-gray">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2v10H3V7zm4-2h1v14H7V5zm3 0h2v14h-2V5zm4 0h1v14h-1V5zm3 2h2v10h-2V7z" />
              </svg>
            </span>
            <input
              ref={barcodeRef}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm font-mono font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              onChange={(e) => { setBarcodeInput(e.target.value); setScanError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualScan(); } }}
              placeholder="ITEM-ACET-500 or scan barcode…"
              type="text"
              value={barcodeInput}
            />
          </div>
          <button
            className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              showCamera
                ? "bg-brand-red text-white hover:bg-red-700"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
            onClick={() => setShowCamera((v) => !v)}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">{showCamera ? "Close Camera" : "Use Camera"}</span>
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700"
            onClick={handleManualScan}
            type="button"
          >
            Scan
          </button>
        </div>
        {scanError && (
          <p className="mt-2 rounded-xl bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
            {scanError}
          </p>
        )}
      </div>

      {/* Camera feed */}
      {showCamera && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Scanned item detail */}
      {scannedLine && (
        <div className="rounded-2xl border-2 border-brand-red/25 bg-red-50/40 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">Scanned Item</p>
              <p className="mt-1 text-base font-semibold text-zinc-950 sm:text-lg">{scannedLine.description}</p>
              <p className="mt-0.5 font-mono text-sm text-brand-gray">{scannedLine.sku}</p>
            </div>
            <button className="shrink-0 text-xs text-brand-gray hover:text-zinc-950" onClick={() => setScannedSku(null)} type="button">
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Bin / Location", value: scannedLine.fromBin },
              { label: "Ordered Qty", value: formatNumber(scannedLine.qty) },
              { label: "Picked Qty (Registered)", value: scannedLine.pickedQty > 0 ? formatNumber(scannedLine.pickedQty) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white px-3.5 py-3 ring-1 ring-inset ring-zinc-200/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gray">{label}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-gray">
                Confirmed Qty (After Physical Check)
              </label>
              <input
                ref={confirmedInputRef}
                className={`mt-1.5 h-11 w-full max-w-[200px] rounded-xl border px-3 text-right text-lg font-semibold outline-none transition focus:ring-2 ${
                  confirmedQtyOver
                    ? "border-red-300 bg-red-50 text-red-700 focus:border-red-400 focus:ring-red-200"
                    : confirmedQtyValid
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 focus:border-emerald-400 focus:ring-emerald-200"
                    : "border-zinc-200 bg-white text-zinc-950 focus:border-brand-red focus:ring-brand-red/20"
                }`}
                min={0}
                onChange={(e) => updateConfirmedQty(scannedLine.sku, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmedQtyValid && !confirmedQtyOver) {
                    e.preventDefault();
                    markVerified(scannedLine.sku);
                  }
                }}
                placeholder="0"
                type="number"
                value={confirmedQtyValue}
              />
              {confirmedQtyOver && (
                <p className="mt-1 text-xs text-red-600">Exceeds ordered qty ({formatNumber(scannedLine.qty)}).</p>
              )}
            </div>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!confirmedQtyValid || confirmedQtyOver}
              onClick={() => markVerified(scannedLine.sku)}
              type="button"
            >
              Mark Verified ✓
            </button>
          </div>
          <p className="mt-2 text-[11px] text-brand-gray">
            Press{" "}
            <kbd className="rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-zinc-700">Enter</kbd>{" "}
            in the quantity field to quickly verify.
          </p>
        </div>
      )}

      {/* Progress + Line verification */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gray">
            Line Verification — {verifiedCount} of {shipment.lines.length} verified
          </p>
          {verifiedCount > 0 && !allVerified && (
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(verifiedCount / shipment.lines.length) * 100}%` }}
              />
            </div>
          )}
          {allVerified && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              All lines verified ✓
            </span>
          )}
        </div>

        {/* Mobile card list (hidden on md+) */}
        <div className="space-y-2 md:hidden">
          {shipment.lines.map((line) => {
            const v = lineVerifications[line.sku];
            const isScanned = scannedSku === line.sku;
            return (
              <div
                key={line.sku}
                className={`rounded-xl border p-3 transition ${
                  v?.verified
                    ? "border-emerald-200 bg-emerald-50/50"
                    : isScanned
                    ? "border-brand-red/30 bg-red-50/40"
                    : "cursor-pointer border-zinc-200 bg-white active:bg-zinc-50"
                }`}
                onClick={() => !v?.verified && selectLine(line)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-medium text-zinc-950">{line.sku}</p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-950">{line.description}</p>
                    <p className="text-xs text-brand-gray">{line.fromBin}</p>
                  </div>
                  {v?.verified ? (
                    <button
                      className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                      onClick={(e) => { e.stopPropagation(); unverify(line.sku); }}
                      type="button"
                    >
                      ✓ Verified
                    </button>
                  ) : isScanned ? (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                      Scanning
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                      Pending
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-gray">
                  <span>Ordered: <strong className="text-zinc-950">{formatNumber(line.qty)}</strong></span>
                  <span>
                    Picked:{" "}
                    <strong className={line.pickedQty > 0 && line.pickedQty < line.qty ? "text-amber-600" : "text-zinc-950"}>
                      {line.pickedQty > 0 ? formatNumber(line.pickedQty) : "—"}
                    </strong>
                  </span>
                  {v?.verified && (
                    <span>Confirmed: <strong className="text-emerald-700">{formatNumber(Number(v.confirmedQty))}</strong></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table (hidden on mobile) */}
        <div className="hidden overflow-hidden rounded-[20px] border border-zinc-200/80 bg-white md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-brand-gray">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Ordered Qty</th>
                <th className="px-4 py-3 text-right">Picked Qty</th>
                <th className="px-4 py-3 text-right">Confirmed Qty</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shipment.lines.map((line) => {
                const v = lineVerifications[line.sku];
                const isScanned = scannedSku === line.sku;
                return (
                  <tr
                    key={line.sku}
                    className={`cursor-pointer transition ${
                      isScanned ? "bg-red-50/60" : v?.verified ? "bg-emerald-50/40" : "bg-white hover:bg-zinc-50/60"
                    }`}
                    onClick={() => !v?.verified && selectLine(line)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-950">{line.sku}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-950">{line.description}</p>
                      <p className="text-xs text-brand-gray">{line.fromBin}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-950">{formatNumber(line.qty)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={line.pickedQty > 0 && line.pickedQty < line.qty ? "font-semibold text-amber-600" : "text-zinc-950"}>
                        {line.pickedQty > 0 ? formatNumber(line.pickedQty) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v?.verified ? (
                        <span className="font-semibold text-emerald-700">{formatNumber(Number(v.confirmedQty))}</span>
                      ) : isScanned ? (
                        <span className="text-xs italic text-brand-gray">Entering…</span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v?.verified ? (
                        <button
                          className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                          onClick={(e) => { e.stopPropagation(); unverify(line.sku); }}
                          title="Click to undo"
                          type="button"
                        >
                          ✓ Verified
                        </button>
                      ) : isScanned ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                          Scanning
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!allVerified && (
          <p className="mt-2 text-xs text-brand-gray">Tap/click any pending row to select it manually, or scan its barcode.</p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
          onClick={onCancel}
          type="button"
        >
          ← Back to Queue
        </button>
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-red px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          disabled={!allVerified}
          onClick={() => onComplete(shipment.id)}
          title={!allVerified ? `${shipment.lines.length - verifiedCount} line(s) not yet verified` : undefined}
          type="button"
        >
          Confirm All &amp; Move to Packing →
        </button>
        {!allVerified && (
          <p className="text-xs text-amber-600">
            Verify all {shipment.lines.length} line{shipment.lines.length === 1 ? "" : "s"} to unlock packing.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CheckingPage() {
  const { user } = useAuth();
  const { warehouseShipments, postChecking } = useBusiness();
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null);

  const userLocationCode = user ? getUserLocationCode(user) : null;

  const pickedShipments = useMemo(
    () =>
      warehouseShipments.filter((s) => {
        if (s.status !== "Picked") return false;
        if (userLocationCode && s.locationCode !== userLocationCode) return false;
        return true;
      }),
    [warehouseShipments, userLocationCode],
  );

  const myChecked = useMemo(
    () => warehouseShipments.filter((s) => s.status === "Checked" && s.checkerId === user?.id),
    [warehouseShipments, user?.id],
  );

  const activeShipment = activeShipmentId
    ? warehouseShipments.find((s) => s.id === activeShipmentId) ?? null
    : null;

  function handleComplete(shipmentId: string) {
    if (!user) return;
    postChecking(shipmentId, { id: user.id, name: user.name });
    setActiveShipmentId(null);
  }

  return (
    <RequireAuth permission="checking:view">
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">Outbound · Checking</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Checking &amp; Packing</h2>
          <p className="mt-2 text-sm text-brand-gray sm:text-base">
            Scan each item barcode, verify quantity, then confirm to move to Packing.
            {userLocationCode ? ` Showing shipments for ${getLocationLabelFromCode(userLocationCode)}.` : ""}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs text-brand-gray sm:text-sm">Awaiting Check</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 sm:mt-3 sm:text-3xl">{formatNumber(pickedShipments.length)}</p>
          </Card>
          <Card>
            <p className="text-xs text-brand-gray sm:text-sm">Checked (My Sessions)</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 sm:mt-3 sm:text-3xl">{formatNumber(myChecked.length)}</p>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <p className="text-xs text-brand-gray sm:text-sm">Checker</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950 sm:mt-3 sm:text-xl">{user?.name ?? "—"}</p>
          </Card>
        </div>

        {/* Active session or queue */}
        {activeShipment ? (
          <Card>
            <ActiveCheckingSession
              key={activeShipment.id}
              shipment={activeShipment}
              onComplete={handleComplete}
              onCancel={() => setActiveShipmentId(null)}
            />
          </Card>
        ) : (
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">Checking Queue</h3>
                <p className="mt-1 text-sm text-brand-gray">
                  Tap <strong>Start Checking</strong> to open the barcode scanner for that shipment.
                </p>
              </div>
              <StepBadge step={0} />
            </div>

            <div className="mt-5 space-y-3">
              {pickedShipments.map((shipment) => (
                <div key={shipment.id} className="rounded-[20px] border border-zinc-200/80 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-950">{shipment.id} — {shipment.partyName}</p>
                      <p className="mt-1 text-xs text-brand-gray">
                        Picked by {shipment.pickerName || "—"} · {getLocationLabelFromCode(shipment.locationCode)} ·{" "}
                        {shipment.sourceId} · {formatNumber(getShipmentLineTotal(shipment))} units ·{" "}
                        {shipment.lines.length} line{shipment.lines.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-semibold text-white transition hover:bg-red-700 sm:w-auto sm:shrink-0"
                      onClick={() => setActiveShipmentId(shipment.id)}
                      type="button"
                    >
                      Start Checking
                    </button>
                  </div>

                  {/* Quick line preview */}
                  <div className="mt-3 space-y-1.5 md:hidden">
                    {shipment.lines.map((line) => (
                      <div key={line.sku} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs">
                        <span className="truncate font-mono font-medium text-zinc-950">{line.sku}</span>
                        <span className="shrink-0 text-brand-gray">{formatNumber(line.qty)} units</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 hidden overflow-hidden rounded-xl border border-zinc-100 md:block">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.14em] text-brand-gray">
                        <tr>
                          <th className="px-4 py-2">SKU</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2 text-right">Ordered Qty</th>
                          <th className="px-4 py-2 text-right">Picked Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {shipment.lines.map((line) => (
                          <tr key={line.sku} className="bg-white">
                            <td className="px-4 py-2 font-mono font-medium text-zinc-950">{line.sku}</td>
                            <td className="px-4 py-2 text-brand-gray">{line.description}</td>
                            <td className="px-4 py-2 text-right text-zinc-950">{formatNumber(line.qty)}</td>
                            <td className="px-4 py-2 text-right">
                              <span className={line.pickedQty > 0 && line.pickedQty < line.qty ? "font-semibold text-amber-600" : line.pickedQty > 0 ? "text-zinc-950" : "text-zinc-300"}>
                                {line.pickedQty > 0 ? formatNumber(line.pickedQty) : "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {pickedShipments.length === 0 && (
                <div className="rounded-xl bg-zinc-50 p-6 text-center text-sm text-brand-gray">
                  No shipments waiting to be checked.
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </RequireAuth>
  );
}
