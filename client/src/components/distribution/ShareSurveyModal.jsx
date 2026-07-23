import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Check, Download, QrCode, Share2 } from "lucide-react";
import {
  IconBrandWhatsapp,
  IconBrandX,
  IconBrandLinkedin,
  IconBrandFacebook,
  IconMail,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { toast } from "sonner";

function slugify(value) {
  return (value || "survey")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function isCanvasSafeLogoSource(src) {
  if (!src || typeof src !== "string") return false;

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return true;
  }

  try {
    const parsed = new URL(src, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (isCanvasSafeLogoSource(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function createRoundedLogoDataUrl(src) {
  return new Promise((resolve, reject) => {
    if (!isCanvasSafeLogoSource(src)) {
      reject(new Error("Cross-origin logo source is not canvas-safe"));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 240;
      const radius = 48;
      const imageRadius = 32;
      const padding = 30;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }

      // Rounded white center badge
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.arcTo(size, 0, size, size, radius);
      ctx.arcTo(size, size, 0, size, radius);
      ctx.arcTo(0, size, 0, 0, radius);
      ctx.arcTo(0, 0, size, 0, radius);
      ctx.closePath();
      ctx.fill();

      // Keep logo aspect ratio stable across different input dimensions
      // and clip to rounded corners so all logo aspect ratios match the
      // same center badge style.
      const maxW = size - padding * 2;
      const maxH = size - padding * 2;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const x = (size - drawW) / 2;
      const y = (size - drawH) / 2;

      ctx.save();
      drawRoundedRect(ctx, x, y, drawW, drawH, imageRadius);
      ctx.clip();
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-background p-3 dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-none text-slate-800 dark:text-slate-100">
          {title}
        </p>
        {description ? (
          <p className="text-xs text-muted-foreground dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

export function ShareSurveyModal({
  open,
  onOpenChange,
  surveyTitle,
  shareUrl,
  preferredLogoUrl = "",
}) {
  const previewQrRef = useRef(null);
  const fallbackQrRef = useRef(null);
  const hiResQrRef = useRef(null);

  const [includeLogo, setIncludeLogo] = useState(false);
  const [showScanLabel, setShowScanLabel] = useState(true);
  const [normalizedLogoSrc, setNormalizedLogoSrc] = useState("");
  const [copied, setCopied] = useState(false);

  const hasLogo = Boolean(preferredLogoUrl);
  const shouldShowCenterPlaceholder = !hasLogo || !includeLogo;
  const centerLogoSrc =
    includeLogo && hasLogo ? normalizedLogoSrc || preferredLogoUrl : "";

  const qrSize = 252; // slightly larger for better presence
  const centerImageSize = 72;
  const centerBadgeSize = centerImageSize + 8;

  useEffect(() => {
    let cancelled = false;
    if (!preferredLogoUrl) {
      setNormalizedLogoSrc("");
      return;
    }

    // Skip canvas processing for cross-origin logos without CORS headers.
    if (!isCanvasSafeLogoSource(preferredLogoUrl)) {
      setNormalizedLogoSrc(preferredLogoUrl);
      return;
    }

    createRoundedLogoDataUrl(preferredLogoUrl)
      .then((dataUrl) => {
        if (!cancelled) setNormalizedLogoSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setNormalizedLogoSrc(preferredLogoUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [preferredLogoUrl]);

  // Start with Scan Me view each time modal opens; user can toggle logo on.
  useEffect(() => {
    if (!open) return;
    setIncludeLogo(false);
  }, [open]);

  const fileName = useMemo(
    () => `${slugify(surveyTitle || "survey")}-qr.png`,
    [surveyTitle]
  );
  const shareText = useMemo(
    () => `Take this survey: ${surveyTitle || "Survey"}`,
    [surveyTitle]
  );
  const shareTargets = useMemo(() => {
    if (!shareUrl) return [];
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    return [
      {
        key: "whatsapp",
        label: "WhatsApp",
        href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        icon: IconBrandWhatsapp,
        buttonClass:
          "hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.20)] dark:hover:border-emerald-400/70 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300 dark:hover:shadow-[0_0_0_3px_rgba(16,185,129,0.26)]",
      },
      {
        key: "x",
        label: "X",
        href: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        icon: IconBrandX,
        buttonClass:
          "hover:border-slate-500/60 hover:bg-slate-100 hover:text-slate-900 hover:shadow-[0_0_0_3px_rgba(71,85,105,0.18)] dark:hover:border-slate-400/70 dark:hover:bg-slate-700/40 dark:hover:text-white dark:hover:shadow-[0_0_0_3px_rgba(148,163,184,0.24)]",
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        icon: IconBrandLinkedin,
        buttonClass:
          "hover:border-sky-500/60 hover:bg-sky-50 hover:text-sky-700 hover:shadow-[0_0_0_3px_rgba(14,165,233,0.20)] dark:hover:border-sky-400/70 dark:hover:bg-sky-500/15 dark:hover:text-sky-300 dark:hover:shadow-[0_0_0_3px_rgba(56,189,248,0.24)]",
      },
      {
        key: "facebook",
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        icon: IconBrandFacebook,
        buttonClass:
          "hover:border-blue-500/60 hover:bg-blue-50 hover:text-blue-700 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.20)] dark:hover:border-blue-400/70 dark:hover:bg-blue-500/15 dark:hover:text-blue-300 dark:hover:shadow-[0_0_0_3px_rgba(96,165,250,0.24)]",
      },
      {
        key: "email",
        label: "Email",
        href: `mailto:?subject=${encodeURIComponent(
          surveyTitle || "Survey"
        )}&body=${encodedText}%0A%0A${encodedUrl}`,
        icon: IconMail,
        buttonClass:
          "hover:border-violet-500/60 hover:bg-violet-50 hover:text-violet-700 hover:shadow-[0_0_0_3px_rgba(139,92,246,0.20)] dark:hover:border-violet-400/70 dark:hover:bg-violet-500/15 dark:hover:text-violet-300 dark:hover:shadow-[0_0_0_3px_rgba(167,139,250,0.24)]",
      },
    ];
  }, [shareText, shareUrl, surveyTitle]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Failed to copy survey link");
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: surveyTitle || "Survey",
        text: shareText,
        url: shareUrl,
      });
    } catch {
      // user cancelled or platform blocked, no toast needed
    }
  };

  const openShareTarget = (href) => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const triggerDownload = (dataUrl) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const drawDownloadCanvas = async (qrCanvas, options = {}) => {
    const forcePlaceholder = options.forcePlaceholder === true;
    // 2× gives a ~1200 px wide PNG — crisp on retina, reasonable file size.
    const SCALE = 2;
    // Logical size the QR is drawn at regardless of the source canvas resolution.
    // Using a fixed 512 px keeps font sizes and spacing proportionate.
    const DRAW_QR_SIZE = 512;
    const labelHeight = showScanLabel ? 92 : 34;
    const outerPadding = 28;
    const cardPadding = 16;
    const cardRadius = 28;
    const cardSize = DRAW_QR_SIZE + cardPadding * 2;

    const logicalW = cardSize + outerPadding * 2;
    const logicalH = cardSize + outerPadding * 2 + labelHeight;

    const out = document.createElement("canvas");
    // Physical resolution = logical × scale
    out.width = logicalW * SCALE;
    out.height = logicalH * SCALE;

    const ctx = out.getContext("2d");
    if (!ctx) return null;

    // All drawing commands use logical coordinates — ctx.scale handles the rest.
    ctx.scale(SCALE, SCALE);
    // Smoother text & image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const panelX = 0;
    const panelY = 0;
    const panelW = logicalW;
    const panelH = logicalH;
    const panelRadius = 22;

    // Clip whole export to rounded panel so there are no corner artifacts.
    ctx.save();
    drawRoundedRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
    ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, logicalW, logicalH);
    ctx.restore();
    const cardX = (logicalW - cardSize) / 2;
    const cardY = panelY + 20;
    const qrX = cardX + cardPadding;
    const qrY = cardY + cardPadding;

    // Outer panel border (light theme)
    ctx.fillStyle = "#FFFFFF";
    drawRoundedRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 2;
    drawRoundedRect(
      ctx,
      panelX + 1,
      panelY + 1,
      panelW - 2,
      panelH - 2,
      panelRadius - 1
    );
    ctx.stroke();

    // White QR card
    ctx.fillStyle = "#FFFFFF";
    drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.10)";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
    ctx.stroke();

    // QR content — draw the hi-res source into the fixed logical draw size.
    ctx.drawImage(qrCanvas, qrX, qrY, DRAW_QR_SIZE, DRAW_QR_SIZE);

    // Draw the same rounded center badge used in preview, for both
    // placeholder and logo modes.
    const badgeSize = Math.round(DRAW_QR_SIZE * 0.32);
    const badgeX = qrX + (DRAW_QR_SIZE - badgeSize) / 2;
    const badgeY = qrY + (DRAW_QR_SIZE - badgeSize) / 2;
    const badgeRadius = Math.max(14, Math.round(badgeSize * 0.22));

    ctx.fillStyle = "#FFFFFF";
    drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
    ctx.stroke();

    const usePlaceholderCenter =
      forcePlaceholder ||
      shouldShowCenterPlaceholder ||
      !isCanvasSafeLogoSource(centerLogoSrc);

    if (usePlaceholderCenter) {
      const centerX = badgeX + badgeSize / 2;
      const scanFont = Math.max(10, Math.round(badgeSize * 0.14));
      const meFont = Math.max(18, Math.round(badgeSize * 0.34));

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#64748B";
      ctx.font = `600 ${scanFont}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillText("SCAN", centerX, badgeY + badgeSize * 0.44);
      ctx.fillStyle = "#0F172A";
      ctx.font = `800 ${meFont}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillText("ME", centerX, badgeY + badgeSize * 0.76);
    } else if (centerLogoSrc) {
      const logoInset = Math.round(badgeSize * 0.16);
      const logoX = badgeX + logoInset;
      const logoY = badgeY + logoInset;
      const logoW = badgeSize - logoInset * 2;
      const logoH = badgeSize - logoInset * 2;
      const logoRadius = Math.max(10, Math.round(logoW * 0.18));
      const logoImage = await loadImage(centerLogoSrc);
      ctx.save();
      drawRoundedRect(ctx, logoX, logoY, logoW, logoH, logoRadius);
      ctx.clip();
      ctx.drawImage(logoImage, logoX, logoY, logoW, logoH);
      ctx.restore();
    }

    if (showScanLabel) {
      const labelText = (surveyTitle || "Survey").trim() || "Survey";
      const maxLabelWidth = panelW - 60;
      let fontSize = 20;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#0f172a";
      do {
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
        if (
          ctx.measureText(labelText).width <= maxLabelWidth ||
          fontSize <= 14
        ) {
          break;
        }
        fontSize -= 1;
      } while (fontSize > 14);

      ctx.fillText(labelText, logicalW / 2, cardY + cardSize + 50);
      ctx.fillStyle = "#64748b";
      ctx.font = "500 14px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText("Scan to open survey", logicalW / 2, cardY + cardSize + 74);
    }

    return out;
  };

  const handleDownload = async () => {
    if (!shareUrl) return;

    const getCanvas = (ref) => ref.current?.querySelector("canvas");
    // Prefer the dedicated high-res canvas for download; fall back to preview/fallback.
    const hiResCanvas = getCanvas(hiResQrRef);
    const primaryCanvas = getCanvas(previewQrRef);
    const fallbackCanvas = getCanvas(fallbackQrRef);
    const preferFallback = !includeLogo || !hasLogo;
    const sourceCanvas = hiResCanvas
      ? hiResCanvas
      : preferFallback
        ? fallbackCanvas || primaryCanvas
        : primaryCanvas || fallbackCanvas;

    if (!sourceCanvas) {
      toast.error("QR code not ready yet");
      return;
    }

    try {
      const composed = await drawDownloadCanvas(sourceCanvas);
      if (!composed) {
        toast.error("Failed to prepare QR image");
        return;
      }
      triggerDownload(composed.toDataURL("image/png"));
    } catch (error) {
      // If logo image load/draw fails (common CORS case), retry with placeholder center.
      if (fallbackCanvas) {
        try {
          const composed = await drawDownloadCanvas(fallbackCanvas, {
            forcePlaceholder: true,
          });
          if (!composed) {
            toast.error("Failed to prepare QR image");
            return;
          }
          triggerDownload(composed.toDataURL("image/png"));
          return;
        } catch (fallbackError) {
          console.error("Fallback QR download failed:", fallbackError);
        }
      }
      console.error("QR download failed:", error);
      toast.error("Failed to download QR code");
    }
  };

  const displayTitle = surveyTitle || "Survey";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden border-0 p-0 pb-3 shadow-2xl dark:bg-slate-950 dark:ring-1 dark:ring-slate-800/80">
        {/* Header */}
        <div className="border-b bg-background px-6 py-5 dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-emerald-500/15">
                <QrCode className="h-4 w-4 text-primary" />
              </span>
              Share Survey
            </DialogTitle>
            <DialogDescription className="mt-1 text-slate-600 dark:text-slate-400">
              Share{" "}
              <span className="font-medium text-foreground dark:text-slate-200">
                {displayTitle}
              </span>{" "}
              via link or QR code.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-2 space-y-5">
          {/* Share actions */}
          {shareUrl && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground -mt-2">
                Share Actions
              </Label>
              <TooltipProvider>
                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip open={copied ? true : undefined}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopy}
                        className={`h-11 rounded-xl border-slate-200 px-4 text-slate-700 transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${copied ? "scale-105 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300" : ""}`}
                        aria-label="Copy survey link"
                      >
                        {copied ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        {copied ? "Copied" : "Copy link"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {copied ? "Copied!" : "Copy link"}
                    </TooltipContent>
                  </Tooltip>
                  {/* Branded social actions with subtle scale + glow on hover */}
                  {typeof navigator !== "undefined" && navigator.share && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleNativeShare}
                          className="h-11 w-11 rounded-xl border-slate-200 p-0 text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_0_3px_rgba(34,197,94,0.20)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          aria-label="Share"
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Share</TooltipContent>
                    </Tooltip>
                  )}
                  {shareTargets.map((target) => {
                    const Icon = target.icon;
                    return (
                      <Tooltip key={target.key}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openShareTarget(target.href)}
                            className={`h-11 w-11 rounded-xl border-slate-200 p-0 text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${target.buttonClass}`}
                            aria-label={target.label}
                          >
                            {Icon ? <Icon className="h-5 w-5" /> : null}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {target.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>
          )}

          {/* QR Card */}
          <div className="rounded-2xl border border-slate-200 bg-muted/20 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900/55">
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="flex justify-center">
                <div ref={previewQrRef} className="relative">
                  {/* Outer "frame" */}
                  <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5 dark:shadow-[0_12px_30px_rgba(2,6,23,0.45)] dark:ring-slate-500/20">
                    <QRCodeCanvas
                      value={shareUrl || ""}
                      size={qrSize}
                      includeMargin
                      level="H"
                    />
                  </div>

                  {/* Center placeholder badge when logo not used */}
                  {shouldShowCenterPlaceholder && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div
                        className="flex items-center justify-center rounded-2xl bg-white shadow-[0_10px_30px_rgba(2,6,23,0.12)] ring-1 ring-black/5"
                        style={{
                          width: `${centerBadgeSize}px`,
                          height: `${centerBadgeSize}px`,
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-semibold tracking-[0.18em] text-foreground">
                            SCAN
                          </span>
                          <span className="-mt-0.5 text-[18px] font-extrabold leading-none text-foreground">
                            ME
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rounded logo badge when logo is used */}
                  {!shouldShowCenterPlaceholder && centerLogoSrc && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div
                        className="flex items-center justify-center rounded-2xl bg-white shadow-[0_10px_30px_rgba(2,6,23,0.12)] ring-1 ring-black/5"
                        style={{
                          width: `${centerBadgeSize}px`,
                          height: `${centerBadgeSize}px`,
                        }}
                      >
                        <img
                          src={centerLogoSrc}
                          alt=""
                          aria-hidden="true"
                          className="h-[72px] w-[72px] rounded-xl object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          {/* <div className="space-y-3">
            <SettingRow
              title="Include favicon/logo"
              description={
                hasLogo
                  ? "Adds your workspace/survey logo to the center of the QR."
                  : "No logo found — QR will be generated without a center image."
              }
            >
              <Switch
                id="share-qr-logo"
                checked={includeLogo && hasLogo}
                onCheckedChange={setIncludeLogo}
                disabled={!hasLogo}
              />
            </SettingRow>
          </div> */}

          {/* Primary CTA */}
          <Button
            type="button"
            onClick={handleDownload}
            className="h-11 w-full"
            disabled={!shareUrl}
          >
            <Download className="mr-2 h-4 w-4" />
            Download QR PNG
          </Button>
        </div>

        {/* Hidden high-res QR canvas (1024 px) — drawn at 512 px logical for proportionate text */}
        <div ref={hiResQrRef} className="hidden" aria-hidden="true">
          <QRCodeCanvas
            value={shareUrl || ""}
            size={1024}
            includeMargin
            level="H"
          />
        </div>

        {/* Hidden fallback QR canvas without logo for cross-origin-safe download fallback */}
        <div ref={fallbackQrRef} className="hidden">
          <QRCodeCanvas
            value={shareUrl || ""}
            size={220}
            includeMargin
            level="H"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
