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
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

type Item = {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
};

const ITEMS: Item[] = [
  { id: '1', name: 'Alice Johnson', role: 'Engineer', status: 'active' },
  { id: '2', name: 'Bob Smith', role: 'Designer', status: 'active' },
  { id: '3', name: 'Carol White', role: 'Manager', status: 'inactive' },
];

const useStyles = makeStyles({
  root: { minWidth: '400px' },
  statusActive: { color: tokens.colorStatusSuccessForeground1 },
  statusInactive: { color: tokens.colorNeutralForegroundDisabled },
});

/**
 * DataGridBasic — Read-only data grid with typed columns.
 *
 * Column definition pattern:
 * - createTableColumn: defines columnId + renderHeaderCell + renderCell
 * - TableCellLayout: consistent cell padding and layout
 */
export const DataGridBasic: React.FC = () => {
  const styles = useStyles();

  const columns: TableColumnDefinition<Item>[] = [
    createTableColumn<Item>({
      columnId: 'name',
      renderHeaderCell: () => 'Name',
      renderCell: item => <TableCellLayout>{item.name}</TableCellLayout>,
    }),
    createTableColumn<Item>({
      columnId: 'role',
      renderHeaderCell: () => 'Role',
      renderCell: item => <TableCellLayout>{item.role}</TableCellLayout>,
    }),
    createTableColumn<Item>({
      columnId: 'status',
      renderHeaderCell: () => 'Status',
      renderCell: item => (
        <TableCellLayout>
          <span className={item.status === 'active' ? styles.statusActive : styles.statusInactive}>
            {item.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </TableCellLayout>
      ),
    }),
  ];

  return (
    <DataGrid
      items={ITEMS}
      columns={columns}
      getRowId={item => item.id}
      className={styles.root}
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
