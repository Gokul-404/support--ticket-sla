import type { User } from "../types";

interface Props {
  agents: User[];
  currentAssigneeId: string | null;
  disabled?: boolean;
  onAssign: (assigneeId: string) => void;
}

export function AssignDropdown({ agents, currentAssigneeId, disabled, onAssign }: Props) {
  return (
    <select
      className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-50"
      value={currentAssigneeId ?? ""}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value) onAssign(e.target.value);
      }}
    >
      <option value="" disabled>
        Assign agent…
      </option>
      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}
