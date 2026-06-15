import { useEffect, useRef, useState } from "react";
import type { CustomCellEditorProps } from "ag-grid-react";
import { TextField } from "@mui/material";
import { formatDuration } from "./duration";

// Three editable segments: hours (no upper bound on digits), minutes and
// seconds (always 2 digits). Each segment is a buffer of typed digits,
// rendered with "_" placeholders for the digits not yet entered - e.g.
// typing "2" into an empty hours segment shows "2_".
type Segments = [string[], string[], string[]];

function initialSegments(value: number | null | undefined): Segments {
  const formatted = formatDuration(value ?? 0).replace("-", "");
  const [hh, mm, ss] = formatted.split(":");
  return [hh.split(""), mm.split(""), ss.split("")];
}

function segmentsToSeconds(segments: Segments): number {
  const [hh, mm, ss] = segments;
  const toNumber = (digits: string[]) => (digits.length ? parseInt(digits.join(""), 10) : 0);
  return toNumber(hh) * 3600 + toNumber(mm) * 60 + toNumber(ss);
}

// Hours can grow without limit; minutes/seconds are always 2 digits.
function widthsFor(segments: Segments): [number, number, number] {
  return [Math.max(2, segments[0].length), 2, 2];
}

export default function DurationCellEditor(props: CustomCellEditorProps<unknown, number>) {
  const { onValueChange } = props;
  const [segments, setSegments] = useState<Segments>(() => initialSegments(props.value));
  const [activeSegment, setActiveSegment] = useState(0);
  const [fresh, setFresh] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const widths = widthsFor(segments);
  const display = segments.map((digits, i) => digits.join("").padEnd(widths[i], "_")).join(":");

  const segmentRanges: [number, number][] = [];
  {
    let pos = 0;
    for (const width of widths) {
      segmentRanges.push([pos, pos + width]);
      pos += width + 1; // +1 for the colon separator
    }
  }

  useEffect(() => {
    onValueChange(segmentsToSeconds(segments));
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
      const isHours = activeSegment === 0;
      const current = fresh ? [] : segments[activeSegment];
      const updated = isHours ? [...current, event.key] : [...current, event.key].slice(-2);
      setSegments((prev) => {
        const next: Segments = [...prev];
        next[activeSegment] = updated;
        return next;
      });
      setFresh(false);
      if (!isHours && updated.length >= 2 && activeSegment < 2) {
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
