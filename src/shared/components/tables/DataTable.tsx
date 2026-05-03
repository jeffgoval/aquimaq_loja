import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { cn } from '@shared/lib/cn';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  getRowId?: (row: TData, index: number) => string;
  /** Optional row click (e.g. selection). */
  onRowClick?: (row: TData) => void;
  /** Extra classes per row. */
  rowClassName?: (row: TData) => string | undefined;
}

/**
 * DataTable v1 — TanStack Table com estilo Aquimaq Slate.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Nenhum registro.',
  getRowId,
  onRowClick,
  rowClassName,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <table className="w-full caption-bottom text-sm">
        <thead className="border-b border-border bg-surface-muted/60">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="h-24 px-3 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 px-3 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-border transition-colors last:border-0 hover:bg-surface-muted/40',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row.original),
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
