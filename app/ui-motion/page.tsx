import {
  CategoryLandingPage,
  categoryMetadata,
} from "@/components/category-landing";

export const metadata = categoryMetadata("ui-motion");

export default function Page() {
  return <CategoryLandingPage category="ui-motion" />;
}
