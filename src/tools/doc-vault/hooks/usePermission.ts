import { useAuth } from '../../../context/AuthContext';
import { DocRecord } from '../types';

export interface DocPermissions {
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
  canAcknowledge: boolean;
}

export function usePermission(doc: DocRecord | null): DocPermissions {
  const { profile } = useAuth();

  if (!doc || !profile) {
    return { canView: false, canEdit: false, canApprove: false, canDelete: false, canAcknowledge: false };
  }

  const uid = profile.uid;
  const role = profile.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;

  const inViewers = doc.acl.viewers.includes(uid);
  const inEditors = doc.acl.editors.includes(uid);
  const inApprovers = doc.acl.approvers.includes(uid);
  const inAny = inViewers || inEditors || inApprovers;

  const canView = isAdmin || (doc.acl.isSensitive ? inApprovers : inAny);
  const canEdit = isAdmin || inEditors || inApprovers;
  const canApprove = isAdmin || (isManager && inApprovers);
  const canDelete = isAdmin || (isManager && inApprovers && doc.status === 'archived');
  const canAcknowledge =
    canView &&
    doc.requiresAck &&
    !doc.ackUserIds.includes(uid) &&
    doc.status === 'approved';

  return { canView, canEdit, canApprove, canDelete, canAcknowledge };
}
