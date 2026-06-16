export const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const date = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${date}`;
};

export const getTimeBand = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'lateNight';
};

export const getTimeLabel = (timeBand) => ({
  afternoon: '下午',
  evening: '晚上',
  lateNight: '深夜',
  morning: '上午',
}[timeBand] ?? '现在');

