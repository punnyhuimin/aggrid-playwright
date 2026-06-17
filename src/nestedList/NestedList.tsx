import { memo, useCallback, useMemo, useState } from "react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { Accordion, AccordionDetails, AccordionSummary, Checkbox, Typography } from "@mui/material";
import { mockCategories } from "./mockData";
import type { ICategory, ISubcategory } from "./types";

const DEFAULT_ROW_HEIGHT = 64;
const EMPTY_SET = new Set<string>();
const CHECKBOX_WIDTH = 42;

interface NestedListRowProps {
  categories: ICategory[];
  expandedCategories: Set<string>;
  expandedSubcategories: Record<string, Set<string>>;
  selectedProducts: Record<string, Record<string, Set<string>>>;
  toggleCategory: (categoryId: string) => void;
  toggleSubcategory: (categoryId: string, subcategoryId: string) => void;
  toggleCategorySelected: (category: ICategory) => void;
  toggleSubcategorySelected: (categoryId: string, subcategory: ISubcategory) => void;
  toggleProductSelected: (categoryId: string, subcategoryId: string, productId: string) => void;
}

const MemoizedCategoryRow = memo(CategoryRow);

function CategoryRowWrapper(props: RowComponentProps<NestedListRowProps>) {
  return <MemoizedCategoryRow {...props} />;
}

function CategoryRow({
  ariaAttributes,
  index,
  style,
  categories,
  expandedCategories,
  expandedSubcategories,
  selectedProducts,
  toggleCategory,
  toggleSubcategory,
  toggleCategorySelected,
  toggleSubcategorySelected,
  toggleProductSelected,
}: RowComponentProps<NestedListRowProps>) {
  const category = categories[index];
  const expandedSubs = expandedSubcategories[category.id] ?? EMPTY_SET;
  const selectedProductsByCategory = selectedProducts[category.id] ?? {};

  const totalProducts = category.subcategories.reduce((sum, sub) => sum + sub.products.length, 0);
  const totalSelected = category.subcategories.reduce(
    (sum, sub) => sum + (selectedProductsByCategory[sub.id]?.size ?? 0),
    0
  );
  const categoryChecked = totalProducts > 0 && totalSelected === totalProducts;
  const categoryIndeterminate = totalSelected > 0 && !categoryChecked;

  return (
    <div {...ariaAttributes} style={style}>
      <Accordion
        disableGutters
        expanded={expandedCategories.has(category.id)}
        onChange={() => toggleCategory(category.id)}
        slotProps={{ transition: { unmountOnExit: true } }}
      >
        <AccordionSummary expandIcon={<span>▼</span>} sx={{ flexDirection: "row-reverse" }}>
          <Checkbox
            checked={categoryChecked}
            indeterminate={categoryIndeterminate}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleCategorySelected(category)}
          />
          <Typography sx={{ alignSelf: "center" }}>{category.name}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {category.subcategories.map((sub) => {
            const selectedInSub = selectedProductsByCategory[sub.id] ?? EMPTY_SET;
            const subChecked = sub.products.length > 0 && selectedInSub.size === sub.products.length;
            const subIndeterminate = selectedInSub.size > 0 && !subChecked;
            const subHasErrors = sub.products.some((p) => p.hasError);

            return (
              <Accordion
                key={sub.id}
                disableGutters
                expanded={expandedSubs.has(sub.id)}
                onChange={() => toggleSubcategory(category.id, sub.id)}
                slotProps={{ transition: { unmountOnExit: true } }}
                sx={subHasErrors ? { borderLeft: "4px solid #FFC107" } : undefined}
              >
                <AccordionSummary
                  expandIcon={<span>▼</span>}
                  sx={{ flexDirection: "row-reverse", pl: `${CHECKBOX_WIDTH}px` }}
                >
                  <Checkbox
                    checked={subChecked}
                    indeterminate={subIndeterminate}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggleSubcategorySelected(category.id, sub)}
                  />
                  <Typography sx={{ alignSelf: "center" }}>{sub.name}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  {sub.products.map((product) => (
                    <div key={product.id} style={{ display: "flex", alignItems: "center", paddingLeft: CHECKBOX_WIDTH, borderLeft: product.hasError ? "4px solid #FFC107" : undefined }}>
                      <Checkbox
                        checked={selectedInSub.has(product.id)}
                        onChange={() => toggleProductSelected(category.id, sub.id, product.id)}
                      />
                      <Typography>{product.name}</Typography>
                    </div>
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </AccordionDetails>
      </Accordion>
    </div>
  );
}

export default function NestedList() {
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: DEFAULT_ROW_HEIGHT });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, Set<string>>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Record<string, Set<string>>>>({});

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
    setExpandedSubcategories((prev) => {
      if (!prev[categoryId]?.size) {
        return prev;
      }
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  }, []);

  const toggleSubcategory = useCallback((categoryId: string, subcategoryId: string) => {
    setExpandedSubcategories((prev) => {
      const current = prev[categoryId] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
      } else {
        next.add(subcategoryId);
      }
      return { ...prev, [categoryId]: next };
    });
  }, []);

  const toggleCategorySelected = useCallback((category: ICategory) => {
    setSelectedProducts((prev) => {
      const current = prev[category.id] ?? {};
      const fullySelected = category.subcategories.every(
        (sub) => (current[sub.id]?.size ?? 0) === sub.products.length
      );
      const next: Record<string, Set<string>> = {};
      category.subcategories.forEach((sub) => {
        next[sub.id] = fullySelected
          ? new Set<string>()
          : new Set(sub.products.map((product) => product.id));
      });
      return { ...prev, [category.id]: next };
    });
  }, []);

  const toggleSubcategorySelected = useCallback((categoryId: string, subcategory: ISubcategory) => {
    setSelectedProducts((prev) => {
      const catProducts = prev[categoryId] ?? {};
      const current = catProducts[subcategory.id] ?? new Set<string>();
      const next = current.size === subcategory.products.length
        ? new Set<string>()
        : new Set(subcategory.products.map((product) => product.id));
      return { ...prev, [categoryId]: { ...catProducts, [subcategory.id]: next } };
    });
  }, []);

  const toggleProductSelected = useCallback((categoryId: string, subcategoryId: string, productId: string) => {
    setSelectedProducts((prev) => {
      const catProducts = prev[categoryId] ?? {};
      const current = catProducts[subcategoryId] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return { ...prev, [categoryId]: { ...catProducts, [subcategoryId]: next } };
    });
  }, []);

  const rowProps = useMemo<NestedListRowProps>(() => ({
    categories: mockCategories,
    expandedCategories,
    expandedSubcategories,
    selectedProducts,
    toggleCategory,
    toggleSubcategory,
    toggleCategorySelected,
    toggleSubcategorySelected,
    toggleProductSelected,
  }), [
    expandedCategories,
    expandedSubcategories,
    selectedProducts,
    toggleCategory,
    toggleSubcategory,
    toggleCategorySelected,
    toggleSubcategorySelected,
    toggleProductSelected,
  ]);

  return (
    <div style={{ height: "100%", width: "100%", maxHeight: "calc(100% - 32px)", overflow: "auto" }}>
      <List
        rowComponent={CategoryRowWrapper}
        rowCount={mockCategories.length}
        rowHeight={rowHeight}
        rowProps={rowProps}
        style={{ height: "100%" }}
      />
    </div>
  );
}
