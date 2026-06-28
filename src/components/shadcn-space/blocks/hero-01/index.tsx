import BrandSlider, {
  type BrandList,
} from "@/components/shadcn-space/blocks/hero-01/brand-slider";
import HeroSection, {
  type AvatarList,
} from "@/components/shadcn-space/blocks/hero-01/hero";

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
] satisfies AvatarList[];

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
] satisfies BrandList[];

export default function AgencyHeroSection() {
  return (
    <div className="relative isolate overflow-hidden bg-background">
      <HeroSection avatarList={avatarList} />
      <BrandSlider brandList={brandList} />
    </div>
  );
}
