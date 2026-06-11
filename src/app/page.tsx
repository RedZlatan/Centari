import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/sections/Hero";
import { Products } from "@/components/sections/Products";
import { Principles } from "@/components/sections/Principles";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.publicMain}>
        <Hero />
        <Products />
        <Principles />
      </main>
      <Footer />
    </>
  );
}
