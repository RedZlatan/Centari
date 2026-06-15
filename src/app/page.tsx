import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Framework } from "@/components/sections/Framework";
import { Hero } from "@/components/sections/Hero";
import { MonolithPrototype } from "@/components/sections/MonolithPrototype";
import { Products } from "@/components/sections/Products";
import { Solutions } from "@/components/sections/Solutions";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.publicMain}>
        <Hero />
        <Framework />
        <Solutions />
        <Products />
        <MonolithPrototype />
      </main>
      <Footer />
    </>
  );
}
