import {
  CategoryLandingPage,
  categoryMetadata,
} from "@/components/category-landing";

export const metadata = categoryMetadata("ai-motion-design");

export default function Page() {
  return <CategoryLandingPage category="ai-motion-design" />;
}
