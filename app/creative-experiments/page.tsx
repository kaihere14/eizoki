import {
  CategoryLandingPage,
  categoryMetadata,
} from "@/components/category-landing";

export const metadata = categoryMetadata("creative-experiments");

export default function Page() {
  return <CategoryLandingPage category="creative-experiments" />;
}
