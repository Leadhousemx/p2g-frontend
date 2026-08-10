interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

interface BackOfficeTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  stickyFirst?: boolean;
}

export default function BackOfficeTable<T>({
  columns,
  rows,
  getKey,
  stickyFirst = false,
}: BackOfficeTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                  stickyFirst && i === 0
                    ? 'sticky left-0 z-10 bg-gray-50'
                    : ''
                } ${col.width ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
            >
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-gray-700 ${
                    stickyFirst && i === 0
                      ? 'sticky left-0 z-10 bg-white'
                      : ''
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
