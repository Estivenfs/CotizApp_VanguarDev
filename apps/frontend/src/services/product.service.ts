import { apiRequest } from "./apiClient";
import type { Product } from "../types";

export async function listProducts() {
  const result = await apiRequest<{ ok: true; items: Product[] }>({ path: "/api/products" });
  return result.items;
}

export async function getProduct(id: number) {
  const result = await apiRequest<{ ok: true; item: Product }>({ path: `/api/products/${id}` });
  return result.item;
}

export async function createProduct(input: Omit<Product, "id">) {
  const result = await apiRequest<{ ok: true; item: Product }>({
    path: "/api/products",
    method: "POST",
    body: input
  });
  return result.item;
}

export async function updateProduct(id: number, input: Omit<Product, "id">) {
  const result = await apiRequest<{ ok: true; item: Product }>({
    path: `/api/products/${id}`,
    method: "PUT",
    body: input
  });
  return result.item;
}

export async function deleteProduct(id: number) {
  await apiRequest<void>({
    path: `/api/products/${id}`,
    method: "DELETE"
  });
}

