import type { Product } from "@/lib/content";
import styles from "./ProductCard.module.css";

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  return (
    <article className={styles.card}>
      <h3 className={styles.name}>{product.name}</h3>
      <p className={styles.description}>{product.description}</p>
    </article>
  );
}
