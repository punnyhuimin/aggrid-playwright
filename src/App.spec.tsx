import { test, expect } from '@playwright/experimental-ct-react';
import App from './App';

test('should render component with AG Grid', async ({ mount }) => {
	// Mount the component
	const component = await mount(<App />);

	// Verify that the AG Grid is rendered by checking for a specific element
	await expect(component.locator('.ag-root')).toBeVisible();

	// Optionally, verify that specific columns are rendered
	await expect(component.locator('.ag-header-cell-text').nth(0)).toHaveText('Make');
	await expect(component.locator('.ag-header-cell-text').nth(1)).toHaveText('Model');

	// Optionally, verify that a specific row is rendered
	await expect(component.locator('.ag-cell').nth(0)).toHaveText('Tesla');
	await expect(component.locator('.ag-cell').nth(1)).toHaveText('Model Y');
});

test('should switch between AG Grid and Nested List tabs', async ({ mount }) => {
	const component = await mount(<App />);

	// AG Grid is visible by default, Nested List is not mounted
	await expect(component.locator('.ag-root')).toBeVisible();
	await expect(component.getByRole('tab', { name: 'Nested List' })).toBeVisible();

	// Switch to the Nested List tab
	await component.getByRole('tab', { name: 'Nested List' }).click();
	await expect(component.locator('.ag-root')).toHaveCount(0);
	await expect(component.locator('.MuiAccordion-root').first()).toBeVisible();

	// Switch back to the AG Grid tab
	await component.getByRole('tab', { name: 'AG Grid' }).click();
	await expect(component.locator('.ag-root')).toBeVisible();
	await expect(component.locator('.MuiAccordion-root')).toHaveCount(0);
});
