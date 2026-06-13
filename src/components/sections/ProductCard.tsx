import type { Product } from "@/lib/content";
import styles from "./ProductCard.module.css";

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.visual} aria-hidden="true">
        <span>{product.visualLabel}</span>
      </div>
      <div className={styles.meta}>
        <span className={styles.status}>{product.status}</span>
      </div>
      <h3 className={styles.name}>{product.name}</h3>
      <p className={styles.description}>{product.description}</p>
      <button className={styles.cta} type="button">
        {product.cta}
      </button>
    </article>
  );
}
