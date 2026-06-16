import { useEffect, useRef, useState } from "react";
import type { CustomCellEditorProps } from "ag-grid-react";
import { TextField } from "@mui/material";
import { formatDuration } from "./duration";

// Three editable segments - hours, minutes, seconds - each always 2 digits.
// Each segment is a buffer of typed digits, rendered with "_" placeholders
// for the digits not yet entered - e.g. typing "2" into an empty hours
// segment shows "2_". The overall duration is capped at 99:59:59.
// The cell value itself is in milliseconds; these segments work in seconds.
type Segments = [string[], string[], string[]];

const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59; // 99:59:59
const WIDTHS: [number, number, number] = [2, 2, 2];

function initialSegments(value: number | null | undefined): Segments {
  const totalSeconds = Math.floor(Math.max(value ?? 0, 0) / 1000);
  const clamped = Math.min(totalSeconds, MAX_SECONDS);
  const formatted = formatDuration(clamped * 1000);
  const [hh, mm, ss] = formatted.split(":");
  return [hh.split(""), mm.split(""), ss.split("")];
}

function segmentsToMillis(segments: Segments): number {
  const [hh, mm, ss] = segments;
  const toNumber = (digits: string[]) => (digits.length ? parseInt(digits.join(""), 10) : 0);
  const totalSeconds = toNumber(hh) * 3600 + toNumber(mm) * 60 + toNumber(ss);
  return Math.min(totalSeconds, MAX_SECONDS) * 1000;
}

export default function DurationCellEditor(props: CustomCellEditorProps<unknown, number>) {
  const { onValueChange } = props;
  const [segments, setSegments] = useState<Segments>(() => initialSegments(props.value));
  const [activeSegment, setActiveSegment] = useState(0);
  const [fresh, setFresh] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const display = segments.map((digits, i) => digits.join("").padEnd(WIDTHS[i], "_")).join(":");

  const segmentRanges: [number, number][] = [];
  {
    let pos = 0;
    for (const width of WIDTHS) {
      segmentRanges.push([pos, pos + width]);
      pos += width + 1; // +1 for the colon separator
    }
  }

  useEffect(() => {
    onValueChange(segmentsToMillis(segments));
  }, [segments, onValueChange]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const [start, end] = segmentRanges[activeSegment];
    input.setSelectionRange(start, end);
    // segmentRanges is derived from segments and recomputed every render,
    // so it's intentionally excluded - only re-sync selection when our own
    // state (active segment / digit buffers) actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment, segments]);

  const handleClick = () => {
    const input = inputRef.current;
    const pos = input?.selectionStart ?? 0;
    const segment = segmentRanges.findIndex(([start, end]) => pos <= end && pos >= start);
    if (segment >= 0) {
      setActiveSegment(segment);
      setFresh(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    const allSelected =
      display.length > 0 && input?.selectionStart === 0 && input?.selectionEnd === display.length;

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const current = fresh ? [] : segments[activeSegment];
      const updated = [...current, event.key].slice(-2);
      setSegments((prev) => {
        const next: Segments = [...prev];
        next[activeSegment] = updated;
        return next;
      });
      setFresh(false);
      if (updated.length >= 2 && activeSegment < 2) {
        setActiveSegment(activeSegment + 1);
        setFresh(true);
      }
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      if (allSelected) {
        setSegments([[], [], []]);
        setActiveSegment(0);
        setFresh(true);
        return;
      }
      if (fresh) {
        setSegments((prev) => {
          const next: Segments = [...prev];
          next[activeSegment] = [];
          return next;
        });
        setFresh(false);
        return;
      }
      setSegments((prev) => {
        const next: Segments = [...prev];
        if (next[activeSegment].length === 0 && activeSegment > 0) {
          next[activeSegment - 1] = next[activeSegment - 1].slice(0, -1);
          setActiveSegment(activeSegment - 1);
        } else {
          next[activeSegment] = next[activeSegment].slice(0, -1);
        }
        return next;
      });
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveSegment((segment) => Math.max(0, segment - 1));
      setFresh(true);
      return;
    }

    if (event.key === "ArrowRight" || event.key === ":") {
      event.preventDefault();
      setActiveSegment((segment) => Math.min(2, segment + 1));
      setFresh(true);
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !["Tab", "Enter", "Escape"].includes(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <TextField
      inputRef={inputRef}
      variant="standard"
      value={display}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onChange={() => {}}
      slotProps={{
        input: { disableUnderline: true },
        htmlInput: { style: { textAlign: "center" } },
      }}
      sx={{ width: "100%", height: "100%", "& .MuiInputBase-root": { height: "100%" } }}
    />
  );
}
