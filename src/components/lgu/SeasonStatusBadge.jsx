import { getSeasonStatusConfig } from '../../services/seasons.service';

export default function SeasonStatusBadge({ status }) {
  const config = getSeasonStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
