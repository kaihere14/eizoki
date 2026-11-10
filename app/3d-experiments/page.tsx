import {
  CategoryLandingPage,
  categoryMetadata,
} from "@/components/category-landing";

export const metadata = categoryMetadata("3d-experiments");

export default function Page() {
  return <CategoryLandingPage category="3d-experiments" />;
}
