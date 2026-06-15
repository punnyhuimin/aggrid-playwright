import { test, expect } from '@playwright/experimental-ct-react';
import NestedList from './NestedList';
import { mockCategories } from './mockData';

test('renders categories collapsed by default', async ({ mount }) => {
	const component = await mount(<NestedList />);

	const firstCategory = mockCategories[0];
	const firstSubcategory = firstCategory.subcategories[0];

	await expect(component.getByText(firstCategory.name)).toBeVisible();
	await expect(component.getByText(firstSubcategory.name)).toHaveCount(0);
});

test('expanding a category reveals its subcategories but not their products', async ({ mount }) => {
	const component = await mount(<NestedList />);

	const firstCategory = mockCategories[0];
	const firstSubcategory = firstCategory.subcategories[0];
	const firstProduct = firstSubcategory.products[0];

	await component.getByText(firstCategory.name).click();

	await expect(component.getByText(firstSubcategory.name)).toBeVisible();
	await expect(component.getByText(firstProduct.name)).toHaveCount(0);
});

test('expanding a subcategory reveals its products', async ({ mount }) => {
	const component = await mount(<NestedList />);

	const firstCategory = mockCategories[0];
	const firstSubcategory = firstCategory.subcategories[0];
	const firstProduct = firstSubcategory.products[0];

	await component.getByText(firstCategory.name).click();
	await component.getByText(firstSubcategory.name).click();

	await expect(component.getByText(firstProduct.name)).toBeVisible();
});

test('collapsing a category hides its subcategories again', async ({ mount }) => {
	const component = await mount(<NestedList />);

	const firstCategory = mockCategories[0];
	const firstSubcategory = firstCategory.subcategories[0];

	await component.getByText(firstCategory.name).click();
	await expect(component.getByText(firstSubcategory.name)).toBeVisible();

	await component.getByText(firstCategory.name).click();
	await expect(component.getByText(firstSubcategory.name)).toHaveCount(0);
});

test('checkboxes can be toggled without expanding/collapsing the accordion', async ({ mount }) => {
	const component = await mount(<NestedList />);

	const firstCategory = mockCategories[0];
	const checkbox = component.getByRole('checkbox').first();

	await expect(checkbox).not.toBeChecked();
	await checkbox.click();
	await expect(checkbox).toBeChecked();

	// Accordion should remain collapsed - clicking the checkbox must not toggle it
	await expect(component.getByText(firstCategory.subcategories[0].name)).toHaveCount(0);
});
