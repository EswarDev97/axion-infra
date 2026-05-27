import * as React from 'react';
import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  DataGridSelectionCell,
  TableCellLayout,
  TableColumnDefinition,
  TableRowId,
  createTableColumn,
} from '@fluentui/react-components';

type Item = {
  id: string;
  file: string;
  modified: string;
  size: string;
};

const ITEMS: Item[] = [
  { id: '1', file: 'design-system.pdf', modified: '2026-03-01', size: '4.2 MB' },
  { id: '2', file: 'component-library.zip', modified: '2026-03-15', size: '12.8 MB' },
  { id: '3', file: 'tokens.json', modified: '2026-04-01', size: '42 KB' },
  { id: '4', file: 'guidelines.docx', modified: '2026-04-03', size: '1.1 MB' },
];

/**
 * DataGridSelectable — Multi-row selection with checkboxes.
 *
 * selectionMode: "multiselect" enables checkboxes + header select-all.
 * selectedItems: Set<TableRowId> tracks selected row IDs.
 * DataGridSelectionCell renders the checkbox column.
 */
export const DataGridSelectable: React.FC = () => {
  const [selectedItems, setSelectedItems] = React.useState<Set<TableRowId>>(new Set());

  const columns: TableColumnDefinition<Item>[] = [
    createTableColumn<Item>({
      columnId: 'file',
      renderHeaderCell: () => 'File',
      renderCell: item => <TableCellLayout>{item.file}</TableCellLayout>,
    }),
    createTableColumn<Item>({
      columnId: 'modified',
      renderHeaderCell: () => 'Modified',
      renderCell: item => <TableCellLayout>{item.modified}</TableCellLayout>,
    }),
    createTableColumn<Item>({
      columnId: 'size',
      renderHeaderCell: () => 'Size',
      renderCell: item => <TableCellLayout>{item.size}</TableCellLayout>,
    }),
  ];

  return (
    <div>
      <p>{selectedItems.size} item(s) selected</p>

      <DataGrid
        items={ITEMS}
        columns={columns}
        selectionMode="multiselect"
        selectedItems={selectedItems}
        onSelectionChange={(e, data) => setSelectedItems(data.selectedItems)}
        getRowId={item => item.id}
      >
        <DataGridHeader>
          <DataGridRow selectionCell={{ 'aria-label': 'Select all rows' }}>
            {({ renderHeaderCell }) => (
              <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
            )}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<Item>>
          {({ item, rowId }) => (
            <DataGridRow<Item>
              key={rowId}
              selectionCell={{ 'aria-label': `Select ${item.file}` }}
            >
              {({ renderCell }) => (
                <DataGridCell>{renderCell(item)}</DataGridCell>
              )}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
};
