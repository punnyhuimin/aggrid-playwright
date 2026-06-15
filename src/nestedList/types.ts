export interface IProduct {
  id: string;
  name: string;
}

export interface ISubcategory {
  id: string;
  name: string;
  products: IProduct[];
}

export interface ICategory {
  id: string;
  name: string;
  subcategories: ISubcategory[];
}
