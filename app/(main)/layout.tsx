import { AppHeader } from "@/components/app-header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      {children}
    </div>
  );
}
