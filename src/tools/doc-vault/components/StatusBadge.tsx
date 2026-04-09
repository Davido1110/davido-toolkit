import { DocStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../utils/lifecycle';

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
