import DomainChecker from "@/components/domain-checker";

export default function Home() {
  return (
    <main className="h-screen w-screen flex items-center justify-center p-4 md:p-10">
      <DomainChecker />
    </main>
  );
}
