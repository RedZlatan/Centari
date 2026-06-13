import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MonolithPrototype } from "@/components/sections/MonolithPrototype";

export default function MonolithPage() {
  return (
    <>
      <Header />
      <main>
        <MonolithPrototype />
      </main>
      <Footer />
    </>
  );
}
