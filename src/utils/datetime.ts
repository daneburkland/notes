export const todayISO = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

export const todayDateString = () => new Date().toDateString();
