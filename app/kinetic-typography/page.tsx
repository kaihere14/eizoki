import {
  CategoryLandingPage,
  categoryMetadata,
} from "@/components/category-landing";

export const metadata = categoryMetadata("kinetic-typography");

export default function Page() {
  return <CategoryLandingPage category="kinetic-typography" />;
}
