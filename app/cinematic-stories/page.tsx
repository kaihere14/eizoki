import {
  CategoryLandingPage,
  categoryMetadata,
} from "@/components/category-landing";

export const metadata = categoryMetadata("cinematic-stories");

export default function Page() {
  return <CategoryLandingPage category="cinematic-stories" />;
}
