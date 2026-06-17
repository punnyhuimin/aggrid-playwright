import { useState, useMemo } from "react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Tab, Tabs } from "@mui/material";
import NestedList from "./nestedList/NestedList";
import DurationCellEditor from "./durationEditor/DurationCellEditor";
import { formatDuration } from "./durationEditor/duration";
import CollabDemo from "./collab/CollabDemo";
import RtkEditDemo from "./rtkEditDemo/RtkEditDemo";

type View = "grid" | "nested" | "collab" | "rtkdemo";

export type ICar = {
  make: string;
  model: string;
  price: number;
  electric: boolean;
  lapTime: number;
};

ModuleRegistry.registerModules([AllCommunityModule]);

function App() {
  // Row Data: The data to be displayed.
  const [rowData] = useState<ICar[]>([
    { make: "Tesla", model: "Model Y", price: 64950, electric: true, lapTime: 95_000 },
    { make: "Ford", model: "F-Series", price: 33850, electric: false, lapTime: 132_000 },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false, lapTime: 140_000 },
    { make: "Mercedes", model: "EQA", price: 48890, electric: true, lapTime: 110_000 },
    { make: "Fiat", model: "500", price: 15774, electric: false, lapTime: 150_000 },
    { make: "Nissan", model: "Juke", price: 20675, electric: false, lapTime: 145_000 },
  ]);

  // Column Definitions: Defines & controls grid columns.
  const [colDefs] = useState<ColDef<ICar>[]>([
    { field: "make", editable: true, filter: true },
    { field: "model" },
    { field: "price", editable: true },
    { field: "electric" },
    {
      field: "lapTime",
      headerName: "Lap Time",
      editable: true,
      cellEditor: DurationCellEditor,
      valueFormatter: (params) => formatDuration(params.value ?? 0),
    },
  ]);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1
    };
  }, []);

  const [view, setView] = useState<View>("grid");

  // Container: Defines the grid's theme & dimensions.
  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Tabs value={view} onChange={(_, newView: View) => setView(newView)}>
        <Tab label="AG Grid" value="grid" />
        <Tab label="Nested List" value="nested" />
        <Tab label="Collab Demo" value="collab" />
        <Tab label="RTK Edit Demo" value="rtkdemo" />
      </Tabs>
      <div style={{ flex: 1, minHeight: 0 }}>
        {view === "grid" && (
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
          />
        )}
        {view === "nested" && <NestedList />}
        {view === "collab" && <CollabDemo />}
        {view === "rtkdemo" && <RtkEditDemo />}
      </div>
    </div>
  );
}

export default App