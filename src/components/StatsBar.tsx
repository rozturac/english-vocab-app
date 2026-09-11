type Props = {
  learned: number;
  due: number;
  streak: number;
  total: number;
  queueLen: number;
};

export function StatsBar({ learned, due, streak, total, queueLen }: Props) {
  return (
    <div className="stats">
      <div className="stat"><span className="stat-n">{learned}</span><span className="stat-l">Öğrenilen</span></div>
      <div className="stat"><span className="stat-n">{due}</span><span className="stat-l">Vadesi gelen</span></div>
      <div className="stat"><span className="stat-n">{queueLen}</span><span className="stat-l">Bugünkü kuyruk</span></div>
      <div className="stat"><span className="stat-n">{streak}</span><span className="stat-l">Seri (gün)</span></div>
      <div className="stat"><span className="stat-n">{total}</span><span className="stat-l">Toplam</span></div>
    </div>
  );
}
