import type { Metadata } from "next";
import { MonolithForm } from "@/components/monolith/MonolithForm";

export const metadata: Metadata = {
  title: "Bring Your Problem · Centari",
  description:
    "Describe a real operational problem. We review every submission. If the problem fits what Centari is building, we will respond.",
};

export default function MonolithPage() {
  return <MonolithForm />;
}
