import { test, expect, type Locator } from '@playwright/experimental-ct-react';
import App from '../App';

async function openEditor(component: Locator) {
	const cell = component.locator('.ag-cell[col-id="lapTime"]').first();
	await cell.dblclick();
	const input = component.locator('.ag-cell[col-id="lapTime"] input');
	await input.waitFor();
	return { cell, input };
}

test('opens with the cell value formatted as HH:MM:SS', async ({ mount }) => {
	const component = await mount(<App />);
	const cell = component.locator('.ag-cell[col-id="lapTime"]').first();

	// Tesla's lapTime is 95_000ms = 00:01:35
	await expect(cell).toHaveText('00:01:35');

	const { input } = await openEditor(component);
	await expect(input).toHaveValue('00:01:35');
});

test('typing into a cleared field fills segments left-to-right with placeholders', async ({ mount }) => {
	const component = await mount(<App />);
	const { cell, input } = await openEditor(component);

	await input.press('Control+a');
	await input.press('Backspace');
	await expect(input).toHaveValue('__:__:__');

	await input.press('2');
	await expect(input).toHaveValue('2_:__:__');

	await input.press('Enter');
	await expect(cell).toHaveText('02:00:00');
});

test('auto-advances to the next segment once two digits are entered', async ({ mount }) => {
	const component = await mount(<App />);
	const { cell, input } = await openEditor(component);

	// hours segment is selected by default
	await input.press('0');
	await input.press('5');
	await expect(input).toHaveValue('05:01:35');

	await input.press('3');
	await input.press('0');
	await expect(input).toHaveValue('05:30:35');

	await input.press('Enter');
	await expect(cell).toHaveText('05:30:35');
});

test('typing the first digit of a segment after navigating replaces its existing value', async ({ mount }) => {
	const component = await mount(<App />);
	const { cell, input } = await openEditor(component);

	await input.press('ArrowRight'); // minutes segment, pre-filled with "01"
	await input.press('5');
	await expect(input).toHaveValue('00:5_:35');

	await input.press('Enter');
	await expect(cell).toHaveText('00:05:35');
});

test('values that overflow a segment are normalized on commit', async ({ mount }) => {
	const component = await mount(<App />);
	const { cell, input } = await openEditor(component);

	await input.press('ArrowRight');
	await input.press('ArrowRight'); // seconds segment, pre-filled with "35"
	await input.press('9');
	await input.press('9');
	await expect(input).toHaveValue('00:01:99');

	await input.press('Enter');
	// 1 minute + 99 seconds = 2 minutes 39 seconds
	await expect(cell).toHaveText('00:02:39');
});

test('backspacing from the start of a segment edits the previous segment', async ({ mount }) => {
	const component = await mount(<App />);
	const { cell, input } = await openEditor(component);

	await input.press('ArrowRight');
	await input.press('ArrowRight'); // seconds segment, pre-filled with "35"
	await input.press('Backspace'); // clears the (selected) seconds segment
	await expect(input).toHaveValue('00:01:__');

	await input.press('Backspace'); // falls back into the minutes segment
	await expect(input).toHaveValue('00:0_:__');

	await input.press('5');
	await expect(input).toHaveValue('00:05:__');

	await input.press('Enter');
	await expect(cell).toHaveText('00:05:00');
});

test('caps the committed duration at 99:59:59', async ({ mount }) => {
	const component = await mount(<App />);
	const { cell, input } = await openEditor(component);

	await input.press('Control+a');
	await input.press('Backspace');

	for (const digit of ['9', '9', '9', '9', '9', '9']) {
		await input.press(digit);
	}
	await expect(input).toHaveValue('99:99:99');

	await input.press('Enter');
	await expect(cell).toHaveText('99:59:59');
});

test('Escape cancels the edit without changing the value', async ({ mount }) => {
	const component = await mount(<App />);
	const { cell, input } = await openEditor(component);

	await input.press('Control+a');
	await input.press('Backspace');
	await input.press('5');

	await input.press('Escape');
	await expect(cell).toHaveText('00:01:35');
});
