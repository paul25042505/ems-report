import {
  dispositionLabel,
  requestStatusLabel,
  stationStatusLabel,
} from "@/lib/constants";

const pill = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap";

const STATION_COLORS: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  PAUSED: "bg-amber-100 text-amber-800",
  CLOSED: "bg-slate-200 text-slate-600",
};
export function StationStatusBadge({ status }: { status: string }) {
  return <span className={`${pill} ${STATION_COLORS[status] ?? ""}`}>{stationStatusLabel(status)}</span>;
}

const DISPOSITION_COLORS: Record<string, string> = {
  OBSERVING: "bg-amber-100 text-amber-800",
  RELEASED: "bg-green-100 text-green-800",
  TRANSFERRED: "bg-red-100 text-red-800",
  REFUSED: "bg-slate-200 text-slate-700",
};
export function DispositionBadge({ value }: { value: string }) {
  return <span className={`${pill} ${DISPOSITION_COLORS[value] ?? ""}`}>{dispositionLabel(value)}</span>;
}

const REQUEST_COLORS: Record<string, string> = {
  PENDING: "bg-red-100 text-red-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  DONE: "bg-green-100 text-green-800",
};
export function RequestStatusBadge({ status }: { status: string }) {
  return <span className={`${pill} ${REQUEST_COLORS[status] ?? ""}`}>{requestStatusLabel(status)}</span>;
}
