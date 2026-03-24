import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '../../../context/AuthContext';
import { getSOPById, upsertProgress } from '../lib/firestore';
import type { SOP, SOPStep } from '../types';
import { ASSIGNEE_ROLE_LABELS, STEP_TYPE_LABELS } from '../types';

interface Props {
  sopId: string;
  onBack: () => void;
}

type ViewMode = 'flow' | 'steps';

const ROLE_COLORS: Record<string, string> = {
  cmo: '#6366f1',
  lead: '#f59e0b',
  staff: '#10b981',
  all: '#3b82f6',
};

const NODE_WIDTH = 260;
const NODE_GAP = 40;
const ROW_HEIGHT = 150;

function makeNodeLabel(step: SOPStep) {
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

function makeNodeStyle(step: SOPStep) {
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
function groupIntoRows(steps: SOPStep[]): SOPStep[][] {
  const rows: SOPStep[][] = [];
  let i = 0;
  while (i < steps.length) {
    if (steps[i].type === 'parallel') {
      const group: SOPStep[] = [steps[i]];
      // Gather by explicit parallelGroup if set, otherwise gather all consecutive parallel steps
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

function buildFlowGraph(steps: SOPStep[]): { nodes: Node[]; edges: Edge[] } {
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

  // Connect rows: every step in row[r] → every step in row[r+1]
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

export default function SOPViewer({ sopId, onBack }: Props) {
  const { profile, user } = useAuth();
  const [sop, setSop] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('steps');
  const [activeStep, setActiveStep] = useState(0);
  const [learningMode, setLearningMode] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    getSOPById(sopId).then(data => {
      setSop(data);
      if (data) {
        const { nodes: n, edges: e } = buildFlowGraph(data.steps);
        setNodes(n);
        setEdges(e);
      }
      setLoading(false);
    });
  }, [sopId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  async function startLearning() {
    if (!user || !sop) return;
    setLearningMode(true);
    setActiveStep(0);
    await upsertProgress(user.uid, sop.id, {
      status: 'in_progress',
      sopTitle: sop.title,
      userName: profile?.name ?? profile?.email ?? '',
    });
  }

  async function completeStep() {
    if (!sop || !user) return;
    const nextStep = activeStep + 1;
    if (nextStep >= sop.steps.length) {
      await upsertProgress(user.uid, sop.id, {
        status: 'completed',
        currentStep: sop.steps.length - 1,
        completedAt: undefined,
      });
      setLearningMode(false);
      alert('Bạn đã hoàn thành SOP này! Kết quả sẽ được gửi cho Team Lead và CMO để phê duyệt.');
    } else {
      setActiveStep(nextStep);
      await upsertProgress(user.uid, sop.id, { currentStep: nextStep });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div>Không tìm thấy SOP.</div>
        <button onClick={onBack} className="mt-2 text-blue-500 hover:underline text-sm">← Quay lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-2 block">
            ← Quay lại
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{sop.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              sop.status === 'published'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {sop.status === 'published' ? 'Published' : 'Nháp'}
            </span>
            <span className="text-gray-400">{sop.category}</span>
            <span className="text-gray-400">{sop.steps.length} bước</span>
            <span className="text-gray-400">v{sop.version}</span>
          </div>
          {sop.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{sop.description}</p>
          )}
        </div>
        {sop.status === 'published' && !learningMode && (
          <button
            onClick={startLearning}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shrink-0"
          >
            Bắt đầu học
          </button>
        )}
      </div>

      {/* Learning Mode Banner */}
      {learningMode && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-green-800 dark:text-green-300">
              Chế độ học — Bước {activeStep + 1} / {sop.steps.length}
            </div>
            <div className="mt-1 h-1.5 w-48 bg-green-200 dark:bg-green-800 rounded-full">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${((activeStep + 1) / sop.steps.length) * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={completeStep}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            {activeStep === sop.steps.length - 1 ? 'Hoàn thành SOP' : 'Tiếp theo →'}
          </button>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {(['steps', 'flow'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              viewMode === m
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {m === 'steps' ? 'Theo bước' : 'Flowchart'}
          </button>
        ))}
      </div>

      {/* Steps View */}
      {viewMode === 'steps' && (
        <div className="space-y-3">
          {sop.steps.map((step, i) => {
            const isActive = learningMode && i === activeStep;
            const isDone = learningMode && i < activeStep;
            return (
              <div
                key={step.id}
                className={`rounded-xl border p-4 transition-all ${
                  isActive
                    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10 shadow-md'
                    : isDone
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    isDone ? 'bg-gray-400' : isActive ? 'bg-green-600' : 'bg-blue-600'
                  }`}>
                    {isDone ? '✓' : step.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{step.title}</h4>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ background: ROLE_COLORS[step.assigneeRole] ?? '#6b7280' }}
                      >
                        {ASSIGNEE_ROLE_LABELS[step.assigneeRole]}
                      </span>
                      {step.sla && (
                        <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                          SLA: {step.sla}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{STEP_TYPE_LABELS[step.type]}</span>
                    </div>
                    {step.description && (
                      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                    {step.exampleOutput && (
                      <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-0.5">Output cần đạt</div>
                        <div className="text-xs text-blue-800 dark:text-blue-300">{step.exampleOutput}</div>
                      </div>
                    )}
                    {step.notes && (
                      <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2">
                        <div className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-0.5">Lưu ý</div>
                        <div className="text-xs text-yellow-800 dark:text-yellow-300">{step.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flow View */}
      {viewMode === 'flow' && (
        <div
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{ height: 560 }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
          >
            <Background color="#e5e7eb" gap={16} />
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
