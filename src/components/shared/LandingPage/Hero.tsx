import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Star } from "lucide-react";

import { Marquee } from "@/components/shared/Marquee";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ratingStarIds = [
  "hero-star-1",
  "hero-star-2",
  "hero-star-3",
  "hero-star-4",
  "hero-star-5",
] as const;

const avatarList = [
  {
    initials: "AK",
    className: "bg-[#3454d1]",
  },
  {
    initials: "NM",
    className: "bg-[#d76b4f]",
  },
  {
    initials: "HR",
    className: "bg-[#356f62]",
  },
  {
    initials: "CX",
    className: "bg-[#6b4ea0]",
  },
] as const;

const brandList = [
  {
    name: "CareOps",
  },
  {
    name: "Northstar Clinics",
  },
  {
    name: "BrightHR",
  },
  {
    name: "FieldPulse",
  },
  {
    name: "Meridian CX",
  },
] as const;

export function HeroSection() {
  return (
    <div className="relative isolate overflow-hidden bg-background">
      <section
        id="home"
        className="relative isolate scroll-mt-24 overflow-hidden px-4 pt-14 pb-8 text-foreground sm:px-6 sm:pt-20 lg:pt-24"
      >
        <div className="absolute inset-0 -z-10 bg-background" />
        <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_16%_42%,color-mix(in_srgb,var(--chart-1)_18%,transparent),transparent_34%),radial-gradient(circle_at_86%_34%,color-mix(in_srgb,var(--primary)_20%,transparent),transparent_34%),linear-gradient(90deg,color-mix(in_srgb,var(--chart-1)_10%,transparent),transparent_36%,color-mix(in_srgb,var(--primary)_9%,transparent))]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-linear-to-b from-transparent to-background" />

        <div className="mx-auto max-w-[1440px] px-0 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-7 sm:gap-8">
            <div className="relative flex flex-col items-center gap-5 text-center sm:gap-6">
              <motion.h1
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="max-w-5xl text-balance font-medium text-[clamp(2.875rem,11vw,6.25rem)] leading-[0.98] tracking-normal text-foreground sm:leading-[0.95]"
              >
                Create branded surveys with{" "}
                <span className="font-serif font-normal italic">
                  thoughtful flow
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.1, ease: "easeInOut" }}
                className="max-w-2xl text-base text-muted-foreground leading-7"
              >
                Launch client-ready surveys with branded workspaces, whitelisted
                access, SMS invitations, and analytics your team can act on
                without spreadsheet cleanup.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
              className="flex flex-col items-center justify-center gap-7 md:flex-row"
            >
              <Button
                asChild
                className="group relative h-12 w-fit cursor-pointer overflow-hidden rounded-full bg-primary p-1 ps-6 pe-14 font-medium text-primary-foreground text-sm shadow-lg shadow-primary/20 transition-all duration-500 hover:bg-primary/90 hover:ps-14 hover:pe-6"
              >
                <Link to="/auth/register">
                  <span className="relative z-10 transition-all duration-500">
                    Start Free
                  </span>
                  <span className="absolute right-1 flex size-10 items-center justify-center rounded-full bg-background text-foreground transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </Link>
              </Button>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-7">
                <AvatarGroup aria-label="SurveyFlow customer teams">
                  {avatarList.map((avatar) => (
                    <Avatar
                      key={avatar.initials}
                      size="lg"
                      className="border-2 border-background shadow-sm ring-0"
                    >
                      <AvatarFallback
                        className={cn(avatar.className, "font-bold text-white")}
                      >
                        {avatar.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex gap-1 text-[#fb923c]">
                    <span className="sr-only">5 star rating</span>
                    {ratingStarIds.map((starId) => (
                      <Star
                        key={starId}
                        className="size-4 fill-current stroke-current"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="font-normal text-sm text-muted-foreground">
                    Trusted by growing service teams
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section aria-label="Trusted teams">
        <div className="px-4 pt-8 pb-20 sm:px-6 md:pt-12 md:pb-24">
          <div className="mx-auto max-w-[1440px]">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.45, ease: "easeInOut" }}
              className="flex flex-col gap-3"
            >
              <div className="relative flex justify-center py-3 text-center md:py-4">
                <div className="grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="hidden h-px bg-linear-to-l from-border to-transparent md:block" />
                  <p className="px-3 text-center font-normal text-sm text-muted-foreground">
                    Loved by teams running branded feedback programs
                  </p>
                  <div className="hidden h-px bg-linear-to-r from-border to-transparent md:block" />
                </div>
              </div>
              <div className="py-4">
                <Marquee pauseOnHover className="p-0 [--duration:22s]">
                  {brandList.map((brand) => (
                    <div
                      key={brand.name}
                      className="mr-8 flex h-10 w-44 items-center justify-center rounded-full border border-border/80 bg-card/75 px-5 font-semibold text-muted-foreground text-sm tracking-normal shadow-xs backdrop-blur lg:mr-16"
                    >
                      {brand.name}
                    </div>
                  ))}
                </Marquee>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
