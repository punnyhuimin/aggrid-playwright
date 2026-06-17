import type { ICategory } from "./types";

const CATEGORY_THEMES = [
  "Electronics",
  "Apparel",
  "Home & Garden",
  "Sports",
  "Books",
  "Toys",
  "Automotive",
  "Garden Tools",
  "Office Supplies",
  "Health & Beauty",
];

export function generateCategories(
  numCategories = 50,
  subcatsPerCategory = 5,
  productsPerSubcat = 10
): ICategory[] {
  return Array.from({ length: numCategories }, (_, ci) => ({
    id: `category-${ci + 1}`,
    name: `${CATEGORY_THEMES[ci % CATEGORY_THEMES.length]} Category ${ci + 1}`,
    subcategories: Array.from({ length: subcatsPerCategory }, (_, si) => ({
      id: `subcategory-${ci + 1}-${si + 1}`,
      name: `Subcategory ${ci + 1}.${si + 1}`,
      products: Array.from({ length: productsPerSubcat }, (_, pi) => ({
        id: `product-${ci + 1}-${si + 1}-${pi + 1}`,
        name: `Product ${ci + 1}.${si + 1}.${pi + 1}`,
        hasError: (ci + si + pi) % 7 === 0,
      })),
    })),
  }));
}

export const mockCategories: ICategory[] = generateCategories();
