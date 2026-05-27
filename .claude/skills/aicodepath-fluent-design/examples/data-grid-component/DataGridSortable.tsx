import * as React from 'react';
import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  TableCellLayout,
  TableColumnDefinition,
  TableColumnSizingOptions,
  createTableColumn,
  useTableFeatures,
  useTableSort,
} from '@fluentui/react-components';

type Item = {
  id: string;
  name: string;
  age: number;
  department: string;
};

const ITEMS: Item[] = [
  { id: '1', name: 'Alice Johnson', age: 32, department: 'Engineering' },
  { id: '2', name: 'Bob Smith', age: 28, department: 'Design' },
  { id: '3', name: 'Carol White', age: 45, department: 'Engineering' },
  { id: '4', name: 'David Lee', age: 35, department: 'Product' },
];

/**
 * DataGridSortable — Column sorting with compare functions.
 *
 * sortable: true on DataGrid enables sort UI.
 * compare: function for each column defines sort order.
 * useTableSort (via useTableFeatures) manages sort state.
 */
export const DataGridSortable: React.FC = () => {
  const columns: TableColumnDefinition<Item>[] = [
    createTableColumn<Item>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => 'Name',
      renderCell: item => <TableCellLayout>{item.name}</TableCellLayout>,
    }),
    createTableColumn<Item>({
      columnId: 'age',
      compare: (a, b) => a.age - b.age,
      renderHeaderCell: () => 'Age',
      renderCell: item => <TableCellLayout>{item.age}</TableCellLayout>,
    }),
    createTableColumn<Item>({
      columnId: 'department',
      compare: (a, b) => a.department.localeCompare(b.department),
      renderHeaderCell: () => 'Department',
      renderCell: item => <TableCellLayout>{item.department}</TableCellLayout>,
    }),
  ];

  const columnSizingOptions: TableColumnSizingOptions = {
    name: { minWidth: 150, defaultWidth: 200 },
    age: { minWidth: 60, defaultWidth: 80 },
    department: { minWidth: 120, defaultWidth: 160 },
  };

  return (
    <DataGrid
      items={ITEMS}
      columns={columns}
      sortable
      getRowId={item => item.id}
      columnSizingOptions={columnSizingOptions}
      resizableColumns
    >
      <DataGridHeader>
        <DataGridRow>
          {({ renderHeaderCell }) => (
            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
          )}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<Item>>
        {({ item, rowId }) => (
          <DataGridRow<Item> key={rowId}>
            {({ renderCell }) => (
              <DataGridCell>{renderCell(item)}</DataGridCell>
            )}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  );
};
