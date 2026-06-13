import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/sections/Hero";
import { MonolithPrototype } from "@/components/sections/MonolithPrototype";
import { Products } from "@/components/sections/Products";
import { Principles } from "@/components/sections/Principles";
import { Solutions } from "@/components/sections/Solutions";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.publicMain}>
        <Hero />
        <Solutions />
        <Products />
        <Principles />
        <MonolithPrototype />
      </main>
      <Footer />
    </>
  );
}
