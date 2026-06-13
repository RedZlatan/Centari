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
          <h2>Centari builds systems, not apps.</h2>
          <p>
            Early product surfaces for spatial work, operational intelligence and physical computing.
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
