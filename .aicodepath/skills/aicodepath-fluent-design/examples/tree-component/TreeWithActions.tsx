import * as React from 'react';
import {
  Button,
  Tree,
  TreeItem,
  TreeItemLayout,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components';
import {
  AddRegular,
  DeleteRegular,
  EditRegular,
  FolderRegular,
  DocumentRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  // Quick action buttons — always in DOM, not injected on hover
  actions: { display: 'flex', gap: '4px' },
});

/**
 * TreeWithActions — Tree with quick action buttons per item.
 *
 * Rules (WAI-ARIA conformance):
 * - Quick actions: 1–2 per node maximum
 * - Actions must ALWAYS be in DOM (never injected on hover)
 * - Actions must also be available via toolbar or context menu
 * - All action buttons need aria-label + Tooltip
 *
 * Use case: file explorer with add/rename/delete per node.
 */
export const TreeWithActions: React.FC = () => {
  const styles = useStyles();
  const [items, setItems] = React.useState([
    { value: 'docs', name: 'docs', type: 'folder' as const },
    { value: 'readme', name: 'README.md', type: 'file' as const },
  ]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();  // prevent tree item toggle
    const name = prompt('New file name:');
    if (name) setItems(prev => [...prev, { value: name, name, type: 'file' }]);
  };

  const handleDelete = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    setItems(prev => prev.filter(item => item.value !== value));
  };

  return (
    <Tree aria-label="Files with actions">
      {items.map(item => (
        <TreeItem
          key={item.value}
          value={item.value}
          itemType={item.type === 'folder' ? 'branch' : 'leaf'}
        >
          <TreeItemLayout
            iconBefore={item.type === 'folder' ? <FolderRegular /> : <DocumentRegular />}
            actions={
              // Quick actions: always in DOM (never on hover only)
              <div className={styles.actions}>
                {item.type === 'folder' && (
                  // Action 1: Add file
                  <Tooltip content={`Add file to ${item.name}`} relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<AddRegular />}
                      aria-label={`Add file to ${item.name}`}
                      onClick={handleAdd}
                    />
                  </Tooltip>
                )}
                {/* Action 2: Delete (max 2 quick actions per node) */}
                <Tooltip content={`Delete ${item.name}`} relationship="label">
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<DeleteRegular />}
                    aria-label={`Delete ${item.name}`}
                    onClick={(e) => handleDelete(e, item.value)}
                  />
                </Tooltip>
              </div>
            }
          >
            {item.name}
          </TreeItemLayout>
        </TreeItem>
      ))}
    </Tree>
  );
};
