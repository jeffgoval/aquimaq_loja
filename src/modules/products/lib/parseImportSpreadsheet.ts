import * as XLSX from 'xlsx';

export type ImportRow = Record<string, string>;

/** Primeira folha do Excel → cabeçalhos = 1ª linha, resto = dados (valores como texto). */
export function parseExcelFirstSheet(buf: ArrayBuffer): { headers: string[]; rows: ImportRow[] } {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, dense: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('O ficheiro não tem folhas.');
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Folha inválida.');

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (raw.length === 0) throw new Error('A primeira folha está vazia ou sem linha de cabeçalho.');

  const normalizeRow = (row: Record<string, unknown>): ImportRow => {
    const o: ImportRow = {};
    for (const [k, v] of Object.entries(row)) {
      const nk = k.trim();
      if (!nk || nk.startsWith('__EMPTY')) continue;
      o[nk] = String(v ?? '').trim();
    }
    return o;
  };

  const first = normalizeRow(raw[0] as Record<string, unknown>);
  const headers = Object.keys(first);
  if (headers.length === 0) throw new Error('Não foi possível ler cabeçalhos na primeira linha.');

  const rows = (raw as Record<string, unknown>[]).map((row) => normalizeRow(row));
  const nonEmpty = rows.filter((row) => Object.values(row).some((v) => v !== ''));
  return { headers, rows: nonEmpty };
}
