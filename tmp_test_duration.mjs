import { chromium } from "playwright-core";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5173");
await page.waitForSelector("text=Lap Time");

const cell = page.locator('.ag-cell[col-id="lapTime"]').first();
console.log("Initial display:", await cell.textContent());

await cell.dblclick();
const input = page.locator('.ag-cell[col-id="lapTime"] input');
await input.waitFor();
console.log("Editor initial:", await input.inputValue());

await page.keyboard.press("Control+a");
await page.keyboard.press("Backspace");
console.log("After clear:", await input.inputValue());
await page.keyboard.press("2");
console.log("After typing 2:", await input.inputValue());
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
console.log("Final display:", await cell.textContent());

await page.screenshot({ path: "tmp_duration_screenshot.png" });
await browser.close();
