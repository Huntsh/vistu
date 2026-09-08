import type { Status } from '@/lib/types';
import { STATUS_LABEL, STATUS_LABEL_SHORT } from '@/lib/types';

export default function StatusBadge({ status, short }: { status: Status; short?: boolean }) {
  return (
    <span className={`badge ${status}`} title={STATUS_LABEL[status]}>
      {short ? STATUS_LABEL_SHORT[status] : STATUS_LABEL[status]}
    </span>
  );
}
