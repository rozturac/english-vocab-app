type Props = {
  streak: number;
  idx: number;
  queueLen: number;
  due: number;
};

export function StatsBar({ streak, idx, queueLen, due }: Props) {
  const progress = queueLen ? `${Math.min(idx + 1, queueLen)}/${queueLen}` : '0/0';
  return (
    <div className="stats-simple" aria-label="Oturum durumu">
      <span>{progress}</span>
      <span className="dot">·</span>
      <span>Seri {streak}</span>
      {due > 0 && (
        <>
          <span className="dot">·</span>
          <span>{due} vade</span>
        </>
      )}
    </div>
  );
}
