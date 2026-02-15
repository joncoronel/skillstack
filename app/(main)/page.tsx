import { HomeContent } from "./home-content";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
