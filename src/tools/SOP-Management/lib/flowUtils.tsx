import { type Node, type Edge, MarkerType } from 'reactflow';
import type { SOPStep } from '../types';
import { ASSIGNEE_ROLE_LABELS } from '../types';

export const ROLE_COLORS: Record<string, string> = {
  cmo: '#6366f1',
  lead: '#f59e0b',
  staff: '#10b981',
  all: '#3b82f6',
};

export const NODE_WIDTH = 260;
export const NODE_GAP = 40;
export const ROW_HEIGHT = 150;

export function makeNodeLabel(step: SOPStep) {
  return (
    <div style={{ textAlign: 'left', padding: '2px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            background: ROLE_COLORS[step.assigneeRole] ?? '#6b7280',
            color: '#fff',
            borderRadius: 4,
            padding: '1px 6px',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {ASSIGNEE_ROLE_LABELS[step.assigneeRole]}
        </span>
        {step.sla && (
          <span style={{ fontSize: 10, color: '#f97316' }}>{step.sla}</span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
        {step.order}. {step.title}
      </div>
      {step.description && (
        <div
          style={{
            fontSize: 11,
            color: '#6b7280',
            marginTop: 3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {step.description}
        </div>
      )}
    </div>
  );
}

export function makeNodeStyle(step: SOPStep) {
  return {
    background: step.type === 'decision' ? '#fef3c7' : '#ffffff',
    border: `2px solid ${ROLE_COLORS[step.assigneeRole] ?? '#e5e7eb'}`,
    borderRadius: 10,
    width: NODE_WIDTH,
    padding: '10px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  };
}

// Group consecutive parallel steps into rows; sequential/decision steps get their own row.
export function groupIntoRows(steps: SOPStep[]): SOPStep[][] {
  const rows: SOPStep[][] = [];
  let i = 0;
  while (i < steps.length) {
    if (steps[i].type === 'parallel') {
      const group: SOPStep[] = [steps[i]];
      const gid = steps[i].parallelGroup;
      let j = i + 1;
      while (
        j < steps.length &&
        steps[j].type === 'parallel' &&
        (gid ? steps[j].parallelGroup === gid : true)
      ) {
        group.push(steps[j]);
        j++;
      }
      rows.push(group);
      i = j;
    } else {
      rows.push([steps[i]]);
      i++;
    }
  }
  return rows;
}

export function buildFlowGraph(steps: SOPStep[]): { nodes: Node[]; edges: Edge[] } {
  const rows = groupIntoRows(steps);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let rowY = 0;
  for (const row of rows) {
    const n = row.length;
    const totalWidth = n * NODE_WIDTH + (n - 1) * NODE_GAP;
    const startX = -(totalWidth / 2);

    row.forEach((step, idx) => {
      nodes.push({
        id: step.id,
        position: { x: startX + idx * (NODE_WIDTH + NODE_GAP), y: rowY },
        data: { label: makeNodeLabel(step) },
        style: makeNodeStyle(step),
      });
    });

    rowY += ROW_HEIGHT;
  }

  for (let r = 0; r < rows.length - 1; r++) {
    for (const src of rows[r]) {
      for (const tgt of rows[r + 1]) {
        edges.push({
          id: `e-${src.id}-${tgt.id}`,
          source: src.id,
          target: tgt.id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#9ca3af', strokeWidth: 2 },
        });
      }
    }
  }

  return { nodes, edges };
}
