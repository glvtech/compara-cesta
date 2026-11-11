export type CategoryId =
  | "graos"
  | "carnes"
  | "laticinios"
  | "hortifruti"
  | "padaria"
  | "bebidas"
  | "mercearia"
  | "limpeza"
  | "higiene";

export interface CatalogItem {
  id: string;
  name: string;
  category: CategoryId;
  /** Unidade de referência do preço, ex.: "5 kg", "1 L", "dúzia". */
  unit: string;
  /** Preço de referência estimado em SP, em reais. */
  price: number;
}

export interface ListItem {
  id: string;
  catalogId: string | null;
  name: string;
  category: CategoryId;
  quantity: number;
  checked: boolean;
  /** Preço real anotado pelo usuário (unitário), se houver. */
  paidPrice: number | null;
}

export interface ShoppingList {
  id: string;
  name: string;
  budget: number | null;
  items: ListItem[];
  updatedAt: number;
}

export interface RetailerProfile {
  id: string;
  name: string;
  description: string;
  /** Multiplicador geral sobre o preço de referência. */
  base: number;
  /** Ajuste por categoria; vale `base` quando ausente. */
  byCategory: Partial<Record<CategoryId, number>>;
}

export interface RetailerTotal {
  retailer: RetailerProfile;
  total: number;
}
