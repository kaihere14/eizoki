import {
  CategoryLandingPage,
  categoryMetadata,
} from "@/components/category-landing";

export const metadata = categoryMetadata("launch-videos");

export default function Page() {
  return <CategoryLandingPage category="launch-videos" />;
}
