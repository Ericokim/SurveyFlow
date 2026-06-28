import { motion } from "framer-motion";

import { Marquee } from "@/components/shadcn-space/animations/marquee";

export interface BrandList {
  name: string;
}

function BrandSlider({ brandList }: { brandList: BrandList[] }) {
  return (
    <section aria-label="Trusted teams">
      <div className="px-4 pt-8 pb-20 sm:px-6 md:pt-12 md:pb-24">
        <div className="mx-auto max-w-6xl">
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
            {brandList.length > 0 && (
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
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default BrandSlider;
