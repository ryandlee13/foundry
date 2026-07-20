export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
