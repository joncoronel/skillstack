export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 bg-[radial-gradient(ellipse_at_center,oklch(from_var(--primary)_l_c_h/5%),transparent_70%)]">
      {children}
    </div>
  );
}
