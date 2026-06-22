// 6-level nested document: Company → Division → Project → DeliveryOrder → Item → Metric
// AG Grid main rows = Delivery Orders (L4); sub-grid rows = Items to Collect (L5).
// Coordinates are WGS84 [longitude, latitude] across Singapore.

export type Metric = {                          // L6
  id: string
  name: string
  value: number
  unit: string
}

export type Subtask = {                         // L5 — item to collect
  id: string
  name: string
  status: 'todo' | 'in-progress' | 'done'
  dueDate: string
  // Where this item is stored for pickup (editable — drives the route on the map)
  stockLon: number
  stockLat: number
  metrics: Metric[]
}

export type Task = {                            // L4 — delivery order
  id: string
  name: string
  status: 'todo' | 'in-progress' | 'done'
  assignee: string          // driver
  dueDate: string
  deliveryTime: string      // "HH:MM"
  priority: 'low' | 'medium' | 'high'
  // Origin of the delivery truck
  fromLon: number
  fromLat: number
  // Delivery destination
  toLon: number
  toLat: number
  subtasks: Subtask[]
}

export type Project = {                         // L3
  id: string
  name: string
  budget: number
  tasks: Task[]
}

export type Division = {                        // L2
  id: string
  name: string
  region: string
  projects: Project[]
}

export type CompanyDoc = {                      // L1
  id: string
  name: string
  divisions: Division[]
}

export const MOCK_DOC_ID = 'demo-company-1'

export const mockCompanyDoc: CompanyDoc = {
  id: MOCK_DOC_ID,
  name: 'Swift Logistics Pte Ltd',
  divisions: [
    {
      id: 'div-1',
      name: 'North Region',
      region: 'North & East Singapore',
      projects: [
        {
          id: 'proj-1',
          name: 'Morning Batch',
          budget: 500_000,
          tasks: [
            {
              id: 'task-1',
              name: 'Delivery #001 – City Hall to Tampines',
              status: 'in-progress',
              assignee: 'Alice Tan',
              dueDate: '2026-06-20',
              deliveryTime: '09:00',
              priority: 'high',
              fromLon: 103.852, fromLat: 1.293,   // City Hall MRT
              toLon:   103.943, toLat:   1.352,   // Tampines Hub
              subtasks: [
                {
                  id: 'sub-1-1', name: 'Collect: Office supplies', status: 'done',
                  dueDate: '2026-06-20', stockLon: 103.856, stockLat: 1.301,  // Bugis
                  metrics: [{ id: 'm1', name: 'Weight', value: 25, unit: 'kg' }, { id: 'm2', name: 'Boxes', value: 4, unit: 'count' }],
                },
                {
                  id: 'sub-1-2', name: 'Collect: Stationery', status: 'in-progress',
                  dueDate: '2026-06-20', stockLon: 103.863, stockLat: 1.308,  // Lavender
                  metrics: [{ id: 'm3', name: 'Weight', value: 8, unit: 'kg' }, { id: 'm4', name: 'Boxes', value: 2, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-2',
              name: 'Delivery #002 – Jurong East to Woodlands',
              status: 'todo',
              assignee: 'Bob Lim',
              dueDate: '2026-06-20',
              deliveryTime: '09:30',
              priority: 'high',
              fromLon: 103.742, fromLat: 1.333,   // Jurong East MRT
              toLon:   103.787, toLat:   1.436,   // Woodlands Checkpoint
              subtasks: [
                {
                  id: 'sub-2-1', name: 'Collect: Electronics', status: 'todo',
                  dueDate: '2026-06-20', stockLon: 103.765, stockLat: 1.315,  // Clementi
                  metrics: [{ id: 'm5', name: 'Weight', value: 15, unit: 'kg' }, { id: 'm6', name: 'Units', value: 6, unit: 'count' }],
                },
                {
                  id: 'sub-2-2', name: 'Collect: Gadgets', status: 'todo',
                  dueDate: '2026-06-20', stockLon: 103.797, stockLat: 1.312,  // Holland V
                  metrics: [{ id: 'm7', name: 'Weight', value: 5, unit: 'kg' }, { id: 'm8', name: 'Units', value: 3, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-3',
              name: 'Delivery #003 – Changi to Orchard',
              status: 'todo',
              assignee: 'Carol Ng',
              dueDate: '2026-06-21',
              deliveryTime: '10:00',
              priority: 'medium',
              fromLon: 103.985, fromLat: 1.357,   // Changi Airport
              toLon:   103.832, toLat:   1.304,   // Orchard Rd
              subtasks: [
                {
                  id: 'sub-3-1', name: 'Collect: Clothing', status: 'todo',
                  dueDate: '2026-06-21', stockLon: 103.943, stockLat: 1.352,  // Tampines
                  metrics: [{ id: 'm9', name: 'Weight', value: 12, unit: 'kg' }, { id: 'm10', name: 'Bags', value: 5, unit: 'count' }],
                },
                {
                  id: 'sub-3-2', name: 'Collect: Accessories', status: 'todo',
                  dueDate: '2026-06-21', stockLon: 103.873, stockLat: 1.350,  // Serangoon
                  metrics: [{ id: 'm11', name: 'Weight', value: 3, unit: 'kg' }, { id: 'm12', name: 'Bags', value: 2, unit: 'count' }],
                },
              ],
            },
          ],
        },
        {
          id: 'proj-2',
          name: 'Afternoon Batch',
          budget: 200_000,
          tasks: [
            {
              id: 'task-4',
              name: 'Delivery #004 – Bedok to Yishun',
              status: 'todo',
              assignee: 'Dave Ong',
              dueDate: '2026-06-20',
              deliveryTime: '13:00',
              priority: 'high',
              fromLon: 103.928, fromLat: 1.324,   // Bedok MRT
              toLon:   103.836, toLat:   1.429,   // Yishun Town
              subtasks: [
                {
                  id: 'sub-4-1', name: 'Collect: Groceries', status: 'todo',
                  dueDate: '2026-06-20', stockLon: 103.908, stockLat: 1.321,  // Kembangan
                  metrics: [{ id: 'm13', name: 'Weight', value: 40, unit: 'kg' }, { id: 'm14', name: 'Crates', value: 3, unit: 'count' }],
                },
                {
                  id: 'sub-4-2', name: 'Collect: Beverages', status: 'todo',
                  dueDate: '2026-06-20', stockLon: 103.893, stockLat: 1.318,  // Paya Lebar
                  metrics: [{ id: 'm15', name: 'Weight', value: 60, unit: 'kg' }, { id: 'm16', name: 'Crates', value: 5, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-5',
              name: 'Delivery #005 – Queenstown to Punggol',
              status: 'todo',
              assignee: 'Eve Chua',
              dueDate: '2026-06-21',
              deliveryTime: '14:00',
              priority: 'medium',
              fromLon: 103.806, fromLat: 1.299,   // Queenstown MRT
              toLon:   103.902, toLat:   1.404,   // Punggol Waterway
              subtasks: [
                {
                  id: 'sub-5-1', name: 'Collect: Hardware', status: 'todo',
                  dueDate: '2026-06-21', stockLon: 103.789, stockLat: 1.307,  // Buona Vista
                  metrics: [{ id: 'm17', name: 'Weight', value: 35, unit: 'kg' }, { id: 'm18', name: 'Boxes', value: 4, unit: 'count' }],
                },
                {
                  id: 'sub-5-2', name: 'Collect: Tools', status: 'todo',
                  dueDate: '2026-06-21', stockLon: 103.848, stockLat: 1.351,  // Bishan
                  metrics: [{ id: 'm19', name: 'Weight', value: 18, unit: 'kg' }, { id: 'm20', name: 'Boxes', value: 2, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-6',
              name: 'Delivery #006 – Bishan to Tuas',
              status: 'todo',
              assignee: 'Frank Ho',
              dueDate: '2026-06-22',
              deliveryTime: '15:00',
              priority: 'low',
              fromLon: 103.848, fromLat: 1.351,   // Bishan MRT
              toLon:   103.636, toLat:   1.321,   // Tuas Port
              subtasks: [
                {
                  id: 'sub-6-1', name: 'Collect: Paper products', status: 'todo',
                  dueDate: '2026-06-22', stockLon: 103.849, stockLat: 1.370,  // Ang Mo Kio
                  metrics: [{ id: 'm21', name: 'Weight', value: 50, unit: 'kg' }, { id: 'm22', name: 'Reams', value: 20, unit: 'count' }],
                },
                {
                  id: 'sub-6-2', name: 'Collect: Packaging', status: 'todo',
                  dueDate: '2026-06-22', stockLon: 103.714, stockLat: 1.340,  // Jurong West
                  metrics: [{ id: 'm23', name: 'Weight', value: 22, unit: 'kg' }, { id: 'm24', name: 'Boxes', value: 10, unit: 'count' }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'div-2',
      name: 'South Region',
      region: 'South & West Singapore',
      projects: [
        {
          id: 'proj-3',
          name: 'Express Deliveries',
          budget: 150_000,
          tasks: [
            {
              id: 'task-7',
              name: 'Delivery #007 – Toa Payoh to Sentosa',
              status: 'done',
              assignee: 'Grace Lee',
              dueDate: '2026-06-20',
              deliveryTime: '10:30',
              priority: 'high',
              fromLon: 103.847, fromLat: 1.333,   // Toa Payoh
              toLon:   103.818, toLat:   1.250,   // Sentosa Gateway
              subtasks: [
                {
                  id: 'sub-7-1', name: 'Collect: Cosmetics', status: 'done',
                  dueDate: '2026-06-20', stockLon: 103.843, stockLat: 1.320,  // Novena
                  metrics: [{ id: 'm25', name: 'Weight', value: 6, unit: 'kg' }, { id: 'm26', name: 'Units', value: 30, unit: 'count' }],
                },
                {
                  id: 'sub-7-2', name: 'Collect: Skincare', status: 'done',
                  dueDate: '2026-06-20', stockLon: 103.845, stockLat: 1.299,  // Dhoby Ghaut
                  metrics: [{ id: 'm27', name: 'Weight', value: 4, unit: 'kg' }, { id: 'm28', name: 'Units', value: 20, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-8',
              name: 'Delivery #008 – Pioneer to CBD',
              status: 'done',
              assignee: 'Henry Goh',
              dueDate: '2026-06-20',
              deliveryTime: '11:00',
              priority: 'high',
              fromLon: 103.697, fromLat: 1.332,   // Pioneer MRT
              toLon:   103.852, toLat:   1.284,   // Raffles Place
              subtasks: [
                {
                  id: 'sub-8-1', name: 'Collect: Pharmaceuticals', status: 'done',
                  dueDate: '2026-06-20', stockLon: 103.706, stockLat: 1.339,  // Boon Lay
                  metrics: [{ id: 'm29', name: 'Weight', value: 10, unit: 'kg' }, { id: 'm30', name: 'Packs', value: 50, unit: 'count' }],
                },
                {
                  id: 'sub-8-2', name: 'Collect: Medical devices', status: 'done',
                  dueDate: '2026-06-20', stockLon: 103.742, stockLat: 1.333,  // Jurong East
                  metrics: [{ id: 'm31', name: 'Weight', value: 20, unit: 'kg' }, { id: 'm32', name: 'Units', value: 8, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-9',
              name: 'Delivery #009 – Sengkang to Clementi',
              status: 'in-progress',
              assignee: 'Iris Wong',
              dueDate: '2026-06-21',
              deliveryTime: '14:30',
              priority: 'medium',
              fromLon: 103.895, fromLat: 1.391,   // Sengkang MRT
              toLon:   103.765, toLat:   1.315,   // Clementi Mall
              subtasks: [
                {
                  id: 'sub-9-1', name: 'Collect: Books', status: 'in-progress',
                  dueDate: '2026-06-21', stockLon: 103.902, stockLat: 1.404,  // Punggol
                  metrics: [{ id: 'm33', name: 'Weight', value: 30, unit: 'kg' }, { id: 'm34', name: 'Boxes', value: 3, unit: 'count' }],
                },
                {
                  id: 'sub-9-2', name: 'Collect: Stationery', status: 'todo',
                  dueDate: '2026-06-21', stockLon: 103.892, stockLat: 1.367,  // Hougang
                  metrics: [{ id: 'm35', name: 'Weight', value: 12, unit: 'kg' }, { id: 'm36', name: 'Boxes', value: 2, unit: 'count' }],
                },
              ],
            },
          ],
        },
        {
          id: 'proj-4',
          name: 'Bulk Orders',
          budget: 80_000,
          tasks: [
            {
              id: 'task-10',
              name: 'Delivery #010 – Kallang to Jurong',
              status: 'in-progress',
              assignee: 'Jack Tan',
              dueDate: '2026-06-20',
              deliveryTime: '08:00',
              priority: 'high',
              fromLon: 103.871, fromLat: 1.311,   // Kallang
              toLon:   103.742, toLat:   1.333,   // Jurong East
              subtasks: [
                {
                  id: 'sub-10-1', name: 'Collect: Steel beams', status: 'in-progress',
                  dueDate: '2026-06-20', stockLon: 103.882, stockLat: 1.317,  // Aljunied
                  metrics: [{ id: 'm37', name: 'Weight', value: 800, unit: 'kg' }, { id: 'm38', name: 'Beams', value: 4, unit: 'count' }],
                },
                {
                  id: 'sub-10-2', name: 'Collect: Concrete mix', status: 'todo',
                  dueDate: '2026-06-20', stockLon: 103.893, stockLat: 1.318,  // Paya Lebar
                  metrics: [{ id: 'm39', name: 'Weight', value: 500, unit: 'kg' }, { id: 'm40', name: 'Bags', value: 20, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-11',
              name: 'Delivery #011 – Ang Mo Kio to Marina Bay',
              status: 'in-progress',
              assignee: 'Karen Yeo',
              dueDate: '2026-06-20',
              deliveryTime: '08:30',
              priority: 'medium',
              fromLon: 103.849, fromLat: 1.370,   // Ang Mo Kio Hub
              toLon:   103.861, toLat:   1.284,   // Marina Bay Sands
              subtasks: [
                {
                  id: 'sub-11-1', name: 'Collect: Timber', status: 'in-progress',
                  dueDate: '2026-06-20', stockLon: 103.839, stockLat: 1.355,  // Marymount
                  metrics: [{ id: 'm41', name: 'Weight', value: 300, unit: 'kg' }, { id: 'm42', name: 'Planks', value: 15, unit: 'count' }],
                },
                {
                  id: 'sub-11-2', name: 'Collect: Roofing tiles', status: 'todo',
                  dueDate: '2026-06-20', stockLon: 103.848, stockLat: 1.351,  // Bishan
                  metrics: [{ id: 'm43', name: 'Weight', value: 200, unit: 'kg' }, { id: 'm44', name: 'Pallets', value: 2, unit: 'count' }],
                },
              ],
            },
            {
              id: 'task-12',
              name: 'Delivery #012 – Sembawang to East Coast',
              status: 'todo',
              assignee: 'Liam Koh',
              dueDate: '2026-06-22',
              deliveryTime: '09:00',
              priority: 'low',
              fromLon: 103.820, fromLat: 1.449,   // Sembawang
              toLon:   103.928, toLat:   1.297,   // East Coast Park
              subtasks: [
                {
                  id: 'sub-12-1', name: 'Collect: Paint', status: 'todo',
                  dueDate: '2026-06-22', stockLon: 103.820, stockLat: 1.403,  // Mandai
                  metrics: [{ id: 'm45', name: 'Weight', value: 80, unit: 'kg' }, { id: 'm46', name: 'Cans', value: 16, unit: 'count' }],
                },
                {
                  id: 'sub-12-2', name: 'Collect: Adhesives', status: 'todo',
                  dueDate: '2026-06-22', stockLon: 103.787, stockLat: 1.436,  // Woodlands
                  metrics: [{ id: 'm47', name: 'Weight', value: 25, unit: 'kg' }, { id: 'm48', name: 'Boxes', value: 5, unit: 'count' }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

// ── Flattened row types ──────────────────────────────────────────────────────

export type TaskRow = {
  _id: string           // dot-path: "divisions.0.projects.1.tasks.2"
  _divisionName: string
  _projectName: string
  id: string
  name: string
  status: Task['status']
  assignee: string
  dueDate: string
  deliveryTime: string
  priority: Task['priority']
  fromLon: number
  fromLat: number
  toLon: number
  toLat: number
}

// SubtaskEntity is what the subtask microservice returns — a flat entity with a
// taskId FK rather than being embedded inside the task document.
export type SubtaskEntity = Omit<Subtask, 'metrics'> & {
  taskId: string
  metricCount: number
}

export type SubtaskRow = {
  _id: string           // = SubtaskEntity.id (stable entity ID, not a positional path)
  taskId: string        // FK to parent task
  id: string
  name: string
  status: Subtask['status']
  dueDate: string
  stockLon: number
  stockLat: number
  metricCount: number
}

export function flattenToTaskRows(doc: CompanyDoc): TaskRow[] {
  const rows: TaskRow[] = []
  doc.divisions.forEach((div, di) => {
    div.projects.forEach((proj, pi) => {
      proj.tasks.forEach((task, ti) => {
        rows.push({
          _id: `divisions.${di}.projects.${pi}.tasks.${ti}`,
          _divisionName: div.name,
          _projectName: proj.name,
          id: task.id,
          name: task.name,
          status: task.status,
          assignee: task.assignee,
          dueDate: task.dueDate,
          deliveryTime: task.deliveryTime,
          priority: task.priority,
          fromLon: task.fromLon,
          fromLat: task.fromLat,
          toLon: task.toLon,
          toLat: task.toLat,
        })
      })
    })
  })
  return rows
}

/** Flatten a SubtaskEntity (from the subtask microservice) into a grid row. */
export function flattenSubtaskRow(entity: SubtaskEntity): SubtaskRow {
  return {
    _id: entity.id,
    taskId: entity.taskId,
    id: entity.id,
    name: entity.name,
    status: entity.status,
    dueDate: entity.dueDate,
    stockLon: entity.stockLon,
    stockLat: entity.stockLat,
    metricCount: entity.metricCount,
  }
}

/** Extract all subtasks from a nested CompanyDoc as flat SubtaskEntity records. */
export function extractSubtaskEntities(doc: CompanyDoc): SubtaskEntity[] {
  const entities: SubtaskEntity[] = []
  doc.divisions.forEach((div) => {
    div.projects.forEach((proj) => {
      proj.tasks.forEach((task) => {
        task.subtasks.forEach((sub) => {
          entities.push({
            id: sub.id,
            taskId: task.id,
            name: sub.name,
            status: sub.status,
            dueDate: sub.dueDate,
            stockLon: sub.stockLon,
            stockLat: sub.stockLat,
            metricCount: sub.metrics.length,
          })
        })
      })
    })
  })
  return entities
}
