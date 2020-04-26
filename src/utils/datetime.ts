export const localTodayISO = () => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

export const todayDateString = () => new Date().toDateString();
