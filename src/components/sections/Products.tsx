import { products } from "@/lib/content";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "./ProductCard";
import styles from "./Products.module.css";

export function Products() {
  return (
    <section className={styles.section} id="products">
      <Container>
        <div className={styles.header}>
          <p className={styles.label}>Products</p>
          <h2>The tools inside the platform.</h2>
          <p>
            Hardware and software for each stage of the operational cycle. From first prototype
            to continuous operation.
          </p>
        </div>
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
