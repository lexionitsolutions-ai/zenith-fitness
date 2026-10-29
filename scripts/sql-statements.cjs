// Split migration SQL without splitting function bodies, comments or quoted text.
module.exports = function statements(sql) {
  const parts = []; let start = 0, single = false, double = false, dollar = false, comment = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], next = sql[i+1];
    if (comment) { if (c === '\n') comment = false; continue; }
    if (!single && !double && !dollar && c === '-' && next === '-') { comment = true; i++; continue; }
    if (!single && !double && c === '$' && next === '$') { dollar = !dollar; i++; continue; }
    if (dollar) continue;
    if (!double && c === "'") { if (single && next === "'") i++; else single = !single; continue; }
    if (!single && c === '"') { if (double && next === '"') i++; else double = !double; continue; }
    if (c === ';' && !single && !double) { parts.push(sql.slice(start, i+1)); start = i+1; }
  }
  if (sql.slice(start).trim()) parts.push(sql.slice(start));
  return parts;
};
