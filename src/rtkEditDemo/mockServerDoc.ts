// 6-level nested document: Company → Division → Project → Task → Subtask → Metric
// AG Grid main rows = Tasks (L4); sub-grid rows = Subtasks (L5); Metrics (L6) shown as count.

export type Metric = {                          // L6
  id: string
  name: string
  value: number
  unit: string
}

export type Subtask = {                         // L5
  id: string
  name: string
  status: 'todo' | 'in-progress' | 'done'
  dueDate: string
  metrics: Metric[]
}

export type Task = {                            // L4 — main grid row
  id: string
  name: string
  status: 'todo' | 'in-progress' | 'done'
  assignee: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
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
  name: 'Acme Corp',
  divisions: [
    {
      id: 'div-1',
      name: 'Engineering',
      region: 'North America',
      projects: [
        {
          id: 'proj-1',
          name: 'Alpha Platform',
          budget: 500_000,
          tasks: [
            {
              id: 'task-1',
              name: 'API Design',
              status: 'done',
              assignee: 'Alice',
              dueDate: '2026-06-01',
              priority: 'high',
              subtasks: [
                { id: 'sub-1-1', name: 'Define endpoints', status: 'done', dueDate: '2026-06-01', metrics: [{ id: 'm1', name: 'Coverage', value: 95, unit: '%' }, { id: 'm2', name: 'Latency', value: 120, unit: 'ms' }] },
                { id: 'sub-1-2', name: 'Write OpenAPI spec', status: 'done', dueDate: '2026-06-01', metrics: [{ id: 'm3', name: 'Endpoints', value: 42, unit: 'count' }, { id: 'm4', name: 'Review time', value: 3, unit: 'days' }] },
              ],
            },
            {
              id: 'task-2',
              name: 'Backend Development',
              status: 'in-progress',
              assignee: 'Bob',
              dueDate: '2026-07-15',
              priority: 'high',
              subtasks: [
                { id: 'sub-2-1', name: 'Auth service', status: 'done', dueDate: '2026-07-15', metrics: [{ id: 'm5', name: 'Tests', value: 87, unit: 'count' }, { id: 'm6', name: 'Coverage', value: 91, unit: '%' }] },
                { id: 'sub-2-2', name: 'Data layer', status: 'in-progress', dueDate: '2026-07-15', metrics: [{ id: 'm7', name: 'Tables', value: 12, unit: 'count' }, { id: 'm8', name: 'Query time', value: 45, unit: 'ms' }] },
              ],
            },
            {
              id: 'task-3',
              name: 'Frontend Development',
              status: 'todo',
              assignee: 'Carol',
              dueDate: '2026-08-30',
              priority: 'medium',
              subtasks: [
                { id: 'sub-3-1', name: 'Design system', status: 'todo', dueDate: '2026-08-30', metrics: [{ id: 'm9', name: 'Components', value: 0, unit: 'count' }, { id: 'm10', name: 'Estimate', value: 10, unit: 'days' }] },
                { id: 'sub-3-2', name: 'Dashboard views', status: 'todo', dueDate: '2026-08-30', metrics: [{ id: 'm11', name: 'Screens', value: 0, unit: 'count' }, { id: 'm12', name: 'Estimate', value: 15, unit: 'days' }] },
              ],
            },
          ],
        },
        {
          id: 'proj-2',
          name: 'Beta Infrastructure',
          budget: 200_000,
          tasks: [
            {
              id: 'task-4',
              name: 'Server Migration',
              status: 'in-progress',
              assignee: 'Dave',
              dueDate: '2026-06-20',
              priority: 'high',
              subtasks: [
                { id: 'sub-4-1', name: 'Inventory audit', status: 'done', dueDate: '2026-06-20', metrics: [{ id: 'm13', name: 'Servers', value: 24, unit: 'count' }, { id: 'm14', name: 'Migrated', value: 18, unit: 'count' }] },
                { id: 'sub-4-2', name: 'Cutover plan', status: 'in-progress', dueDate: '2026-06-20', metrics: [{ id: 'm15', name: 'Risk score', value: 3, unit: '/5' }, { id: 'm16', name: 'Downtime', value: 2, unit: 'hours' }] },
              ],
            },
            {
              id: 'task-5',
              name: 'Load Balancing',
              status: 'todo',
              assignee: 'Eve',
              dueDate: '2026-07-01',
              priority: 'medium',
              subtasks: [
                { id: 'sub-5-1', name: 'Config HAProxy', status: 'todo', dueDate: '2026-07-01', metrics: [{ id: 'm17', name: 'Nodes', value: 4, unit: 'count' }, { id: 'm18', name: 'RPS target', value: 5000, unit: 'req/s' }] },
                { id: 'sub-5-2', name: 'Load test', status: 'todo', dueDate: '2026-07-01', metrics: [{ id: 'm19', name: 'Scenarios', value: 0, unit: 'count' }, { id: 'm20', name: 'Duration', value: 60, unit: 'min' }] },
              ],
            },
            {
              id: 'task-6',
              name: 'Monitoring Setup',
              status: 'todo',
              assignee: 'Frank',
              dueDate: '2026-07-10',
              priority: 'low',
              subtasks: [
                { id: 'sub-6-1', name: 'Dashboards', status: 'todo', dueDate: '2026-07-10', metrics: [{ id: 'm21', name: 'Panels', value: 0, unit: 'count' }, { id: 'm22', name: 'Alerts', value: 0, unit: 'count' }] },
                { id: 'sub-6-2', name: 'Alerting rules', status: 'todo', dueDate: '2026-07-10', metrics: [{ id: 'm23', name: 'Rules', value: 0, unit: 'count' }, { id: 'm24', name: 'SLA target', value: 99.9, unit: '%' }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'div-2',
      name: 'Operations',
      region: 'Europe',
      projects: [
        {
          id: 'proj-3',
          name: 'Gamma Rollout',
          budget: 150_000,
          tasks: [
            {
              id: 'task-7',
              name: 'Market Analysis',
              status: 'done',
              assignee: 'Grace',
              dueDate: '2026-05-15',
              priority: 'high',
              subtasks: [
                { id: 'sub-7-1', name: 'Competitor research', status: 'done', dueDate: '2026-05-15', metrics: [{ id: 'm25', name: 'Competitors', value: 8, unit: 'count' }, { id: 'm26', name: 'Market share', value: 12, unit: '%' }] },
                { id: 'sub-7-2', name: 'Customer surveys', status: 'done', dueDate: '2026-05-15', metrics: [{ id: 'm27', name: 'Responses', value: 240, unit: 'count' }, { id: 'm28', name: 'NPS', value: 42, unit: 'score' }] },
              ],
            },
            {
              id: 'task-8',
              name: 'User Onboarding',
              status: 'in-progress',
              assignee: 'Henry',
              dueDate: '2026-07-31',
              priority: 'high',
              subtasks: [
                { id: 'sub-8-1', name: 'Tutorial flows', status: 'in-progress', dueDate: '2026-07-31', metrics: [{ id: 'm29', name: 'Steps', value: 6, unit: 'count' }, { id: 'm30', name: 'Completion rate', value: 68, unit: '%' }] },
                { id: 'sub-8-2', name: 'Email sequences', status: 'todo', dueDate: '2026-07-31', metrics: [{ id: 'm31', name: 'Emails', value: 0, unit: 'count' }, { id: 'm32', name: 'Open rate target', value: 35, unit: '%' }] },
              ],
            },
            {
              id: 'task-9',
              name: 'Support Training',
              status: 'todo',
              assignee: 'Iris',
              dueDate: '2026-08-15',
              priority: 'medium',
              subtasks: [
                { id: 'sub-9-1', name: 'Training materials', status: 'todo', dueDate: '2026-08-15', metrics: [{ id: 'm33', name: 'Modules', value: 0, unit: 'count' }, { id: 'm34', name: 'Hours', value: 8, unit: 'h' }] },
                { id: 'sub-9-2', name: 'Mock sessions', status: 'todo', dueDate: '2026-08-15', metrics: [{ id: 'm35', name: 'Sessions', value: 0, unit: 'count' }, { id: 'm36', name: 'Attendees', value: 0, unit: 'count' }] },
              ],
            },
          ],
        },
        {
          id: 'proj-4',
          name: 'Delta Compliance',
          budget: 80_000,
          tasks: [
            {
              id: 'task-10',
              name: 'Audit Preparation',
              status: 'in-progress',
              assignee: 'Jack',
              dueDate: '2026-06-30',
              priority: 'high',
              subtasks: [
                { id: 'sub-10-1', name: 'Evidence gathering', status: 'in-progress', dueDate: '2026-06-30', metrics: [{ id: 'm37', name: 'Controls', value: 45, unit: 'count' }, { id: 'm38', name: 'Covered', value: 30, unit: 'count' }] },
                { id: 'sub-10-2', name: 'Gap analysis', status: 'todo', dueDate: '2026-06-30', metrics: [{ id: 'm39', name: 'Gaps', value: 7, unit: 'count' }, { id: 'm40', name: 'Critical', value: 2, unit: 'count' }] },
              ],
            },
            {
              id: 'task-11',
              name: 'Policy Documentation',
              status: 'in-progress',
              assignee: 'Karen',
              dueDate: '2026-07-20',
              priority: 'medium',
              subtasks: [
                { id: 'sub-11-1', name: 'Draft policies', status: 'in-progress', dueDate: '2026-07-20', metrics: [{ id: 'm41', name: 'Policies', value: 12, unit: 'count' }, { id: 'm42', name: 'Approved', value: 5, unit: 'count' }] },
                { id: 'sub-11-2', name: 'Legal review', status: 'todo', dueDate: '2026-07-20', metrics: [{ id: 'm43', name: 'Documents', value: 0, unit: 'count' }, { id: 'm44', name: 'Est. days', value: 14, unit: 'days' }] },
              ],
            },
            {
              id: 'task-12',
              name: 'Final Review',
              status: 'todo',
              assignee: 'Liam',
              dueDate: '2026-09-01',
              priority: 'low',
              subtasks: [
                { id: 'sub-12-1', name: 'Board sign-off', status: 'todo', dueDate: '2026-09-01', metrics: [{ id: 'm45', name: 'Signatories', value: 3, unit: 'count' }, { id: 'm46', name: 'ETA', value: 0, unit: 'days' }] },
                { id: 'sub-12-2', name: 'Certification filing', status: 'todo', dueDate: '2026-09-01', metrics: [{ id: 'm47', name: 'Filings', value: 0, unit: 'count' }, { id: 'm48', name: 'Deadline risk', value: 2, unit: '/5' }] },
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
  priority: Task['priority']
  _rawSubtasks: Subtask[]
}

export type SubtaskRow = {
  _id: string           // dot-path: "divisions.0.projects.1.tasks.2.subtasks.3"
  id: string
  name: string
  status: Subtask['status']
  dueDate: string
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
          priority: task.priority,
          _rawSubtasks: task.subtasks,
        })
      })
    })
  })
  return rows
}

export function flattenSubtaskRows(taskId: string, subtasks: Subtask[]): SubtaskRow[] {
  return subtasks.map((sub, si) => ({
    _id: `${taskId}.subtasks.${si}`,
    id: sub.id,
    name: sub.name,
    status: sub.status,
    dueDate: sub.dueDate,
    metricCount: sub.metrics.length,
  }))
}
