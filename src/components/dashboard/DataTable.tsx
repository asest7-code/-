"use client";

import { useMemo, useState } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T>({
  title,
  description,
  rows,
  columns,
  defaultSortKey,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "검색어를 입력하세요"
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  defaultSortKey?: string;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(defaultSortKey ?? columns[0]?.key ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const lowered = query.toLowerCase();

    return rows.filter((row) =>
      columns.some((column) => {
        const rendered = column.render(row);
        return String(rendered ?? "").toLowerCase().includes(lowered);
      })
    );
  }, [columns, query, rows]);

  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return filteredRows;

    return [...filteredRows].sort((left, right) => {
      const a = column.sortValue?.(left) ?? "";
      const b = column.sortValue?.(right) ?? "";

      if (a === b) return 0;
      const result = a > b ? 1 : -1;
      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {searchable ? (
            <input
              className="input w-full lg:max-w-sm"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-3">
                  <button
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => {
                      if (!column.sortValue) return;
                      if (sortKey === column.key) {
                        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
                      } else {
                        setSortKey(column.key);
                        setSortDirection("desc");
                      }
                    }}
                  >
                    <span>{column.header}</span>
                    {column.sortValue ? (
                      <span className="text-xs">{sortKey === column.key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-3 align-top">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-slate-500">
                  조건에 맞는 데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm">
        <span>
          총 {sortedRows.length.toLocaleString("ko-KR")}개 / {safePage}페이지
        </span>
        <div className="flex gap-2">
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            이전
          </button>
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            disabled={safePage === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            다음
          </button>
        </div>
      </div>
    </section>
  );
}
