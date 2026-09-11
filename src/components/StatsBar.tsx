type Props = {
  idx: number;
  queueLen: number;
  streak: number;
  due: number;
  showDetail: boolean;
  onToggleDetail: () => void;
};

export function StatsBar({ idx, queueLen, streak, due, showDetail, onToggleDetail }: Props) {
  const n = queueLen ? Math.min(idx + 1, queueLen) : 0;
  const progress = `${n} / ${queueLen} kart`;
  return (
    <div className="stats-simple" aria-label="Oturum durumu">
      <span className="progress-count">{progress}</span>
      <button type="button" className="stats-toggle" onClick={onToggleDetail}>
        {showDetail ? 'Detayı gizle' : 'Detay'}
      </button>
      {showDetail && (
        <span className="stats-detail">
          Üst üste gün: {streak}
          {due > 0 ? ` · Bugün tekrar: ${due}` : ''}
        </span>
      )}
    </div>
  );
}
