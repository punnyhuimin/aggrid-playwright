import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import type { CustomCellEditorProps } from "ag-grid-react";
import DurationCellEditor from "./DurationCellEditor";

function renderEditor(value: number | null | undefined) {
  const onValueChange = vi.fn();
  const props = { value, onValueChange } as unknown as CustomCellEditorProps<unknown, number>;
  render(<DurationCellEditor {...props} />);
  const input = screen.getByRole("textbox") as HTMLInputElement;
  return { input, onValueChange };
}

describe("DurationCellEditor", () => {
  it("renders the initial value formatted as HH:MM:SS", () => {
    const { input } = renderEditor(95_000);
    expect(input).toHaveValue("00:01:35");
  });

  it("notifies onValueChange with the initial value on mount", () => {
    const { onValueChange } = renderEditor(95_000);
    expect(onValueChange).toHaveBeenCalledWith(95_000);
  });

  it("treats a null value as 00:00:00", () => {
    const { input, onValueChange } = renderEditor(null);
    expect(input).toHaveValue("00:00:00");
    expect(onValueChange).toHaveBeenCalledWith(0);
  });

  it("clears all segments on select-all + backspace", () => {
    const { input } = renderEditor(95_000);
    input.setSelectionRange(0, input.value.length);
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(input).toHaveValue("__:__:__");
  });

  it("typing a digit replaces the active segment when fresh", () => {
    const { input } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "2" });
    expect(input).toHaveValue("2_:01:35");
  });

  it("auto-advances to the next segment once two digits are entered", () => {
    const { input } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "0" });
    fireEvent.keyDown(input, { key: "5" });
    expect(input).toHaveValue("05:01:35");

    fireEvent.keyDown(input, { key: "3" });
    fireEvent.keyDown(input, { key: "0" });
    expect(input).toHaveValue("05:30:35");
  });

  it("ArrowRight moves to the next segment, where typing replaces its value", () => {
    const { input } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: "5" });
    expect(input).toHaveValue("00:5_:35");
  });

  it("ArrowLeft does not move before the first segment", () => {
    const { input } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    fireEvent.keyDown(input, { key: "9" });
    expect(input).toHaveValue("9_:01:35");
  });

  it("ArrowRight does not move past the last segment", () => {
    const { input } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: "9" });
    expect(input).toHaveValue("00:01:9_");
  });

  it("backspacing from an empty fresh segment falls back to the previous segment", () => {
    const { input } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: "ArrowRight" }); // seconds segment, pre-filled with "35"

    fireEvent.keyDown(input, { key: "Backspace" }); // fresh backspace clears seconds
    expect(input).toHaveValue("00:01:__");

    fireEvent.keyDown(input, { key: "Backspace" }); // falls back into minutes
    expect(input).toHaveValue("00:0_:__");
  });

  it("sums overflowed segments into the committed millisecond value", () => {
    const { input, onValueChange } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: "ArrowRight" }); // seconds segment
    fireEvent.keyDown(input, { key: "9" });
    fireEvent.keyDown(input, { key: "9" });

    expect(input).toHaveValue("00:01:99");
    // 1 minute + 99 seconds = 159 seconds
    expect(onValueChange).toHaveBeenLastCalledWith(159_000);
  });

  it("caps the committed value at 99:59:59", () => {
    const { input, onValueChange } = renderEditor(95_000);
    input.setSelectionRange(0, input.value.length);
    fireEvent.keyDown(input, { key: "Backspace" });

    for (const digit of ["9", "9", "9", "9", "9", "9"]) {
      fireEvent.keyDown(input, { key: digit });
    }

    expect(input).toHaveValue("99:99:99");
    expect(onValueChange).toHaveBeenLastCalledWith(359_999_000);
  });

  it("ignores keys that are not digits, navigation, or editing keys", () => {
    const { input } = renderEditor(95_000);
    fireEvent.keyDown(input, { key: "a" });
    expect(input).toHaveValue("00:01:35");
  });
});
