export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="bg-cyan-700">{children}</div>;
}
