import { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { SOP } from '../types';
import { buildFlowGraph } from '../lib/flowUtils';

interface Props {
  sop: SOP | null;
  onOpen: (sop: SOP) => void;
}

export default function FlowPreview({ sop, onOpen }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (sop && sop.steps.length > 0) {
      const { nodes: n, edges: e } = buildFlowGraph(sop.steps);
      setNodes(n);
      setEdges(e);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [sop?.id]);

  if (!sop) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 select-none">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-sm font-medium">Chọn một SOP để xem flowchart</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
            {sop.title}
          </h2>
          {sop.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
              {sop.description}
            </p>
          )}
        </div>
        <button
          onClick={() => onOpen(sop)}
          className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors whitespace-nowrap"
        >
          Xem chi tiết →
        </button>
      </div>

      {/* Flowchart */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
        {sop.steps.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            SOP này chưa có bước nào
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            zoomOnScroll={false}
          >
            <Background color="#e5e7eb" gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
