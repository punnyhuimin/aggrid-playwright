import { useEffect, useMemo, useRef } from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import { subtaskBatchEdited } from '../store/subtaskEditsSlice'
import { documentApi } from '../store/documentApi'
import { makeTaskRowSelector } from '../store/selectors'
import { extractSubtaskEntities, MOCK_DOC_ID } from './mockServerDoc'

// ArcGIS Maps SDK — assets served from /arcgis-assets/assets/ by viteStaticCopy
import esriConfig from '@arcgis/core/config'
import '@arcgis/core/assets/esri/themes/light/main.css'

esriConfig.assetsPath = '/arcgis-assets/assets'

import MapView from '@arcgis/core/views/MapView'
import ArcGISMap from '@arcgis/core/Map'
import Basemap from '@arcgis/core/Basemap'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import Graphic from '@arcgis/core/Graphic'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Polyline from '@arcgis/core/geometry/Polyline'
import Point from '@arcgis/core/geometry/Point'
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'
import TextSymbol from '@arcgis/core/symbols/TextSymbol'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel'

// One colour per division (indexed by position in doc.divisions array)
const DIVISION_COLORS: [number, number, number][] = [
  [0, 114, 206],   // North Region → blue
  [255, 127, 0],   // South Region → orange
]

function divisionColor(divisionName: string): [number, number, number] {
  if (divisionName === 'North Region') return DIVISION_COLORS[0]
  return DIVISION_COLORS[1]
}

const ORIGIN_SYMBOL = new SimpleMarkerSymbol({
  style: 'triangle',
  size: 10,
  color: [34, 139, 34],
  outline: { color: [255, 255, 255], width: 1 },
})

const DEST_SYMBOL = new SimpleMarkerSymbol({
  style: 'circle',
  size: 10,
  color: [200, 0, 0],
  outline: { color: [255, 255, 255], width: 1 },
})

function stockSymbol(color: [number, number, number]) {
  return new SimpleMarkerSymbol({
    style: 'square',
    size: 9,
    color,
    outline: { color: [255, 255, 255], width: 1.5 },
  })
}

function labelSymbol(text: string, color: [number, number, number]) {
  return new TextSymbol({
    text,
    color,
    font: { size: 9, weight: 'bold' },
    haloColor: [255, 255, 255],
    haloSize: 1,
    xoffset: 0,
    yoffset: 12,
  })
}

export default function MapPanel() {
  const dispatch = useAppDispatch()

  // ── Data from Redux ─────────────────────────────────────────────────────────
  const taskRowSelector = useMemo(() => makeTaskRowSelector(MOCK_DOC_ID), [])
  const taskRows = useAppSelector(taskRowSelector)

  const serverDoc = useAppSelector(
    (s) => documentApi.endpoints.getDocument.select(MOCK_DOC_ID)(s).data,
  )
  const subtaskPatches = useAppSelector((s) => s.editsSubtasks.patches)

  // Subtask stock locations with patches overlaid — drives routes on the map
  const subtaskLocations = useMemo(() => {
    if (!serverDoc) return []
    return extractSubtaskEntities(serverDoc).map((e) => ({
      id: e.id,
      taskId: e.taskId,
      name: e.name,
      stockLon: (subtaskPatches[`${e.id}.stockLon`]?.localValue as number) ?? e.stockLon,
      stockLat: (subtaskPatches[`${e.id}.stockLat`]?.localValue as number) ?? e.stockLat,
    }))
  }, [serverDoc, subtaskPatches])

  // ── Map refs ────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<MapView | null>(null)
  const routeLayerRef = useRef<GraphicsLayer | null>(null)
  const endpointLayerRef = useRef<GraphicsLayer | null>(null)
  const stockLayerRef = useRef<GraphicsLayer | null>(null)     // editable via sketch
  const sketchVMRef = useRef<SketchViewModel | null>(null)

  // graphic ID maps so we can update in-place without full layer clear
  const routeGfxRef = useRef(new Map<string, Graphic>())      // taskId → route line
  const originGfxRef = useRef(new Map<string, Graphic>())     // taskId → origin marker
  const destGfxRef = useRef(new Map<string, Graphic>())       // taskId → dest marker
  const stockGfxRef = useRef(new Map<string, Graphic>())      // subtaskId → stock marker
  const labelGfxRef = useRef(new Map<string, Graphic>())      // subtaskId → label

  // Guards against the re-render effect triggering another SketchViewModel event
  const applyingRef = useRef(false)

  // Capture old stock coords at sketch 'start' for correct undo oldValue
  const beforeLonRef = useRef<number | null>(null)
  const beforeLatRef = useRef<number | null>(null)

  // ── Initialize map once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const routeLayer    = new GraphicsLayer({ title: 'Routes' })
    const endpointLayer = new GraphicsLayer({ title: 'Endpoints' })
    const stockLayer    = new GraphicsLayer({ title: 'Stock locations' })

    routeLayerRef.current    = routeLayer
    endpointLayerRef.current = endpointLayer
    stockLayerRef.current    = stockLayer

    // OneMap Singapore tiles — no API key required
    const basemap = new Basemap({
      baseLayers: [
        new WebTileLayer({
          urlTemplate: 'https://www.onemap.gov.sg/maps/tiles/Default/{level}/{col}/{row}.png',
          copyright: '© OneMap, Singapore Land Authority',
        }),
      ],
      title: 'OneMap Singapore',
      thumbnailUrl: 'https://www.onemap.gov.sg/favicon.ico',
    })
    const map = new ArcGISMap({
      basemap,
      layers: [routeLayer, endpointLayer, stockLayer],
    })

    const view = new MapView({
      container: containerRef.current,
      map,
      center: [103.82, 1.35],
      zoom: 11,
    })
    viewRef.current = view

    // SketchViewModel over stockLayer: click a stock marker to move it
    const sketchVM = new SketchViewModel({
      view,
      layer: stockLayer,
      updateOnGraphicClick: true,
    })
    sketchVMRef.current = sketchVM

    sketchVM.on('update', (event) => {
      if (applyingRef.current) return

      const graphic = event.graphics[0]
      if (!graphic?.geometry || graphic.geometry.type !== 'point') return

      const toolType = event.toolEventInfo?.type

      // Capture start position at initial selection or at the start of each drag
      if (event.state === 'start' || toolType === 'move-start') {
        const pt = graphic.geometry as Point
        beforeLonRef.current = pt.longitude
        beforeLatRef.current = pt.latitude
        return
      }

      // Dispatch immediately when the user releases the mouse after dragging so the
      // table updates right away. In ArcGIS SDK, 'complete' only fires when the user
      // clicks elsewhere; 'move-stop' fires on mouse-up.
      if (toolType === 'move-stop') {
        const pt = graphic.geometry as Point
        const subtaskId = graphic.attributes?.subtaskId as string
        if (!subtaskId || beforeLonRef.current == null || beforeLatRef.current == null) return

        const newLon = Math.round(pt.longitude * 1000) / 1000
        const newLat = Math.round(pt.latitude * 1000) / 1000
        const oldLon = Math.round(beforeLonRef.current * 1000) / 1000
        const oldLat = Math.round(beforeLatRef.current * 1000) / 1000

        // Reset refs so the complete event below doesn't double-dispatch
        beforeLonRef.current = null
        beforeLatRef.current = null

        if (newLon === oldLon && newLat === oldLat) return

        // Group lon + lat into one undo entry so a single Undo restores both
        dispatch(
          subtaskBatchEdited([
            { path: `${subtaskId}.stockLon`, newValue: newLon, oldValue: oldLon },
            { path: `${subtaskId}.stockLat`, newValue: newLat, oldValue: oldLat },
          ]),
        )
        return
      }

      // Fallback for keyboard-driven completion (Enter) without a preceding move-stop
      if (event.state === 'complete' && !event.aborted) {
        const pt = graphic.geometry as Point
        const subtaskId = graphic.attributes?.subtaskId as string
        if (!subtaskId || beforeLonRef.current == null || beforeLatRef.current == null) return

        const newLon = Math.round(pt.longitude * 1000) / 1000
        const newLat = Math.round(pt.latitude * 1000) / 1000
        const oldLon = Math.round(beforeLonRef.current * 1000) / 1000
        const oldLat = Math.round(beforeLatRef.current * 1000) / 1000

        beforeLonRef.current = null
        beforeLatRef.current = null

        if (newLon === oldLon && newLat === oldLat) return

        dispatch(
          subtaskBatchEdited([
            { path: `${subtaskId}.stockLon`, newValue: newLon, oldValue: oldLon },
            { path: `${subtaskId}.stockLat`, newValue: newLat, oldValue: oldLat },
          ]),
        )
      }
    })

    // Capture Map references now so the cleanup function doesn't read stale .current
    const routeGfx   = routeGfxRef.current
    const originGfx  = originGfxRef.current
    const destGfx    = destGfxRef.current
    const stockGfx   = stockGfxRef.current
    const labelGfx   = labelGfxRef.current

    return () => {
      sketchVM.destroy()
      view.destroy()
      viewRef.current          = null
      routeLayerRef.current    = null
      endpointLayerRef.current = null
      stockLayerRef.current    = null
      sketchVMRef.current      = null
      routeGfx.clear()
      originGfx.clear()
      destGfx.clear()
      stockGfx.clear()
      labelGfx.clear()
    }
  }, [dispatch])

  // ── Re-render routes and markers whenever data changes ──────────────────────
  useEffect(() => {
    const routeLayer    = routeLayerRef.current
    const endpointLayer = endpointLayerRef.current
    const stockLayer    = stockLayerRef.current
    if (!routeLayer || !endpointLayer || !stockLayer) return

    applyingRef.current = true

    // Group subtask locations by taskId
    const subsByTask = new Map<string, typeof subtaskLocations>()
    for (const sub of subtaskLocations) {
      if (!subsByTask.has(sub.taskId)) subsByTask.set(sub.taskId, [])
      subsByTask.get(sub.taskId)!.push(sub)
    }

    const seenTaskIds   = new Set<string>()
    const seenSubtaskIds = new Set<string>()

    for (const task of taskRows) {
      seenTaskIds.add(task.id)
      const subs = subsByTask.get(task.id) ?? []
      const color = divisionColor(task._divisionName)

      // Build polyline path: origin → stock locations → destination
      const path: [number, number][] = [
        [task.fromLon, task.fromLat],
        ...subs.map((s) => [s.stockLon, s.stockLat] as [number, number]),
        [task.toLon, task.toLat],
      ]

      // Route polyline
      const routeGeom = new Polyline({ paths: [path], spatialReference: { wkid: 4326 } })
      const existingRoute = routeGfxRef.current.get(task.id)
      if (existingRoute) {
        existingRoute.geometry = routeGeom
      } else {
        const g = new Graphic({
          geometry: routeGeom,
          symbol: new SimpleLineSymbol({ color: [...color, 0.85], width: 2.5 }),
          attributes: { taskId: task.id },
          popupTemplate: {
            title: task.name,
            content: `Driver: ${task.assignee}  |  ${task.deliveryTime}  |  ${subs.length} pickup${subs.length !== 1 ? 's' : ''}`,
          },
        })
        routeLayer.add(g)
        routeGfxRef.current.set(task.id, g)
      }

      // Origin marker (green triangle)
      const originPt = new Point({ longitude: task.fromLon, latitude: task.fromLat, spatialReference: { wkid: 4326 } })
      const existingOrigin = originGfxRef.current.get(task.id)
      if (existingOrigin) {
        existingOrigin.geometry = originPt
      } else {
        const g = new Graphic({
          geometry: originPt,
          symbol: ORIGIN_SYMBOL,
          attributes: { taskId: task.id },
          popupTemplate: { title: `Origin: ${task.name}`, content: `Departs at ${task.deliveryTime}` },
        })
        endpointLayer.add(g)
        originGfxRef.current.set(task.id, g)
      }

      // Destination marker (red circle)
      const destPt = new Point({ longitude: task.toLon, latitude: task.toLat, spatialReference: { wkid: 4326 } })
      const existingDest = destGfxRef.current.get(task.id)
      if (existingDest) {
        existingDest.geometry = destPt
      } else {
        const g = new Graphic({
          geometry: destPt,
          symbol: DEST_SYMBOL,
          attributes: { taskId: task.id },
          popupTemplate: { title: `Destination: ${task.name}`, content: `Deliver by ${task.dueDate}` },
        })
        endpointLayer.add(g)
        destGfxRef.current.set(task.id, g)
      }

      // Stock location markers (draggable squares)
      for (const sub of subs) {
        seenSubtaskIds.add(sub.id)
        const stockPt = new Point({ longitude: sub.stockLon, latitude: sub.stockLat, spatialReference: { wkid: 4326 } })
        const existingStock = stockGfxRef.current.get(sub.id)
        if (existingStock) {
          existingStock.geometry = stockPt
          const existingLabel = labelGfxRef.current.get(sub.id)
          if (existingLabel) existingLabel.geometry = stockPt
        } else {
          const g = new Graphic({
            geometry: stockPt,
            symbol: stockSymbol(color),
            attributes: { subtaskId: sub.id, taskId: task.id },
            popupTemplate: {
              title: sub.name,
              content: `For: ${task.name}<br/>Lon: ${sub.stockLon.toFixed(4)}, Lat: ${sub.stockLat.toFixed(4)}<br/><em>Drag to change pickup location</em>`,
            },
          })
          stockLayer.add(g)
          stockGfxRef.current.set(sub.id, g)

          // Label above the marker
          const label = new Graphic({
            geometry: stockPt,
            symbol: labelSymbol(sub.name.replace('Collect: ', ''), color),
          })
          endpointLayer.add(label)
          labelGfxRef.current.set(sub.id, label)
        }
      }
    }

    // Remove graphics for tasks / subtasks that no longer exist
    for (const [id, g] of routeGfxRef.current) {
      if (!seenTaskIds.has(id)) {
        routeLayer.remove(g); routeGfxRef.current.delete(id)
        const og = originGfxRef.current.get(id)
        if (og) { endpointLayer.remove(og); originGfxRef.current.delete(id) }
        const dg = destGfxRef.current.get(id)
        if (dg) { endpointLayer.remove(dg); destGfxRef.current.delete(id) }
      }
    }
    for (const [id, g] of stockGfxRef.current) {
      if (!seenSubtaskIds.has(id)) {
        stockLayer.remove(g); stockGfxRef.current.delete(id)
        const lg = labelGfxRef.current.get(id)
        if (lg) { endpointLayer.remove(lg); labelGfxRef.current.delete(id) }
      }
    }

    applyingRef.current = false
  }, [taskRows, subtaskLocations])

  // ── Legend ──────────────────────────────────────────────────────────────────
  const divisionNames = useMemo(
    () => [...new Set(taskRows.map((t) => t._divisionName))],
    [taskRows],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar / legend */}
      <Box
        sx={{
          px: 1.5, py: 0.75,
          borderBottom: 1, borderColor: 'divider',
          display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Delivery Routes
        </Typography>

        <Stack direction="row" spacing={0.5}>
          {divisionNames.map((name) => {
            const [r, g, b] = divisionColor(name)
            return (
              <Chip
                key={name}
                label={name}
                size="small"
                sx={{ height: 20, fontSize: 11, bgcolor: `rgb(${r},${g},${b})`, color: '#fff' }}
              />
            )
          })}
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ width: 10, height: 10, bgcolor: 'rgb(34,139,34)', display: 'inline-block', clipPath: 'polygon(50% 0%,100% 100%,0% 100%)' }} />
          <Typography variant="caption" color="text.secondary">Origin</Typography>
          <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'rgb(200,0,0)', display: 'inline-block', ml: 1 }} />
          <Typography variant="caption" color="text.secondary">Destination</Typography>
          <Box component="span" sx={{ width: 9, height: 9, bgcolor: 'rgb(0,114,206)', display: 'inline-block', ml: 1 }} />
          <Typography variant="caption" color="text.secondary">Stock (drag to edit · Undo via Status Panel)</Typography>
        </Box>
      </Box>

      {/* ArcGIS map fills remaining space */}
      <Box ref={containerRef} sx={{ flex: 1, minHeight: 0 }} />
    </Box>
  )
}
