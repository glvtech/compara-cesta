import type { RetailerProfile } from "@/lib/types";

/**
 * Perfis genéricos de rede (sem marcas). Os multiplicadores são ESTIMATIVAS
 * iniciais para SP, não medições. Ver docs/PRECOS.md.
 */
export const RETAILERS: RetailerProfile[] = [
  {
    id: "atacarejo",
    name: "Atacarejo",
    description: "Compra em maior volume, preço baixo em básicos e carnes.",
    base: 0.92,
    byCategory: { graos: 0.88, carnes: 0.9, bebidas: 0.9, limpeza: 0.9, hortifruti: 0.98 },
  },
  {
    id: "hipermercado",
    name: "Hipermercado",
    description: "Grande variedade, preço próximo da média.",
    base: 0.99,
    byCategory: { limpeza: 0.95, higiene: 0.95, hortifruti: 1.02 },
  },
  {
    id: "supermercado",
    name: "Supermercado de bairro",
    description: "Perto de casa, preço um pouco acima da média.",
    base: 1.06,
    byCategory: { hortifruti: 0.97, padaria: 1.02 },
  },
  {
    id: "premium",
    name: "Rede premium",
    description: "Qualidade e variedade, preço mais alto.",
    base: 1.18,
    byCategory: { hortifruti: 1.1, carnes: 1.2, laticinios: 1.15 },
  },
];
