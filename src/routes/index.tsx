import { createFileRoute } from "@tanstack/react-router";
import { useLenis } from "lenis/react";
import { useEffect } from "react";
import { FeaturesSection } from "@/components/shared/LandingPage/Features";
import { HeroSection } from "@/components/shared/LandingPage/Hero";
import { PricingSection } from "@/components/shared/LandingPage/Price";
import { ResourcesSection } from "@/components/shared/LandingPage/Resources";
import { TemplatesSection } from "@/components/shared/LandingPage/Templates";
import Navbar from "@/components/shared/Navbar";
import { type LandingSectionId, landingSectionIds } from "@/constants/landing";

export const Route = createFileRoute("/")({ component: LandingPage });

function isLandingSectionId(sectionId: string): sectionId is LandingSectionId {
  return landingSectionIds.some((id) => id === sectionId);
}

function useLandingScroll() {
  const lenis = useLenis();

  useEffect(() => {
    function scrollToSection(sectionId: string) {
      if (!isLandingSectionId(sectionId)) return;

      const element = document.getElementById(sectionId);
      if (!element) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (lenis && !prefersReducedMotion) {
        lenis.scrollTo(element, { offset: -88 });
        return;
      }

      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }

    function handleScrollRequest(event: Event) {
      const sectionId = (event as CustomEvent<{ sectionId?: string }>).detail
        ?.sectionId;

      if (sectionId) scrollToSection(sectionId);
    }

    window.addEventListener(
      "surveyflow:scroll-to-section",
      handleScrollRequest,
    );

    return () => {
      window.removeEventListener(
        "surveyflow:scroll-to-section",
        handleScrollRequest,
      );
    };
  }, [lenis]);
}

function LandingPage() {
  useLandingScroll();

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="public" />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TemplatesSection />
        <PricingSection />
        <ResourcesSection />
      </main>
    </div>
  );
}
