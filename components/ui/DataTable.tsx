'use client';

import { ReactNode } from 'react';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessor: (row: T) => unknown;
  sortKey?: string;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sort?: { key: string; dir: 'asc' | 'desc' };
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  filterSlot?: ReactNode;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sort,
  onSort,
  filterSlot,
  pagination,
  emptyMessage = 'No data',
  className = '',
}: DataTableProps<T>) {
  const displayValue = (col: DataTableColumn<T>, row: T) => {
    const value = col.accessor(row);
    if (col.render) return col.render(value, row);
    if (value == null) return '—';
    if (typeof value === 'object' && 'toLocaleDateString' in (value as Date)) {
      return (value as Date).toLocaleDateString();
    }
    return String(value);
  };

  const handleHeaderClick = (col: DataTableColumn<T>) => {
    if (!onSort || !col.sortKey) return;
    const nextDir =
      sort?.key === col.sortKey && sort?.dir === 'asc' ? 'desc' : 'asc';
    onSort(col.sortKey, nextDir);
  };

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  return (
    <div className={`space-y-3 ${className}`}>
      {filterSlot && <div className="flex flex-wrap items-center gap-2">{filterSlot}</div>}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={col.className}
                >
                  {onSort && col.sortKey ? (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick(col)}
                      className="flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900 text-left"
                    >
                      {col.header}
                      {sort?.key === col.sortKey && (
                        <span className="text-blue-600">
                          {sort.dir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={keyExtractor(row)}>
                  {columns.map((col) => (
                    <td key={col.id} className={col.className}>
                      {displayValue(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pagination.page} of {totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
