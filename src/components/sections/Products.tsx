import { products } from "@/lib/content";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "./ProductCard";
import styles from "./Products.module.css";

export function Products() {
  return (
    <section className={styles.section} id="products">
      <Container>
        <p className={styles.label}>The ecosystem</p>
        <div className={styles.intro}>
          <h2>Choose the right level of reality.</h2>
          <p>
            Centari brings AI, 2D interfaces, 3D environments, spatial computing
            and physical workflows together for planning, simulation and execution.
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
