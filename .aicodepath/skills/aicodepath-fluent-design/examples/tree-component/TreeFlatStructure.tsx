import * as React from 'react';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
  useHeadlessFlatTree,
  HeadlessFlatTreeItemProps,
} from '@fluentui/react-components';
import { FolderRegular, DocumentRegular } from '@fluentui/react-icons';

type FlatTreeItem = HeadlessFlatTreeItemProps & {
  name: string;
  type: 'folder' | 'file';
};

// Flat data structure with parentValue references
// useHeadlessFlatTree handles converting this to a tree hierarchy
const FLAT_ITEMS: FlatTreeItem[] = [
  { value: 'root', name: 'project', type: 'folder', itemType: 'branch' },
  { value: 'src', name: 'src', type: 'folder', itemType: 'branch', parentValue: 'root' },
  { value: 'components', name: 'components', type: 'folder', itemType: 'branch', parentValue: 'src' },
  { value: 'Button', name: 'Button.tsx', type: 'file', itemType: 'leaf', parentValue: 'components' },
  { value: 'Input', name: 'Input.tsx', type: 'file', itemType: 'leaf', parentValue: 'components' },
  { value: 'Dialog', name: 'Dialog.tsx', type: 'file', itemType: 'leaf', parentValue: 'components' },
  { value: 'index', name: 'index.ts', type: 'file', itemType: 'leaf', parentValue: 'src' },
  { value: 'package', name: 'package.json', type: 'file', itemType: 'leaf', parentValue: 'root' },
];

/**
 * TreeFlatStructure — Dynamic tree using useHeadlessFlatTree hook.
 *
 * Use for dynamic data (API-fetched, large datasets, lazy-loaded children).
 * useHeadlessFlatTree converts flat items with parentValue into tree hierarchy.
 *
 * parentValue: links each item to its parent (undefined = root level).
 *
 * vs static Tree: static Tree for small, known hierarchies;
 * useHeadlessFlatTree for dynamic, large, or lazy-loaded trees.
 */
export const TreeFlatStructure: React.FC = () => {
  const flatTree = useHeadlessFlatTree(FLAT_ITEMS, {
    defaultOpenItems: ['root', 'src'],  // expanded by default
  });

  return (
    <Tree
      {...flatTree.getTreeProps()}
      aria-label="Project structure"
    >
      {Array.from(flatTree.items(), item => {
        const { name, type } = item.getTreeItemProps() as FlatTreeItem;

        return (
          <TreeItem
            key={item.value}
            {...item.getTreeItemProps()}
          >
            <TreeItemLayout
              iconBefore={
                type === 'folder'
                  ? <FolderRegular />
                  : <DocumentRegular />
              }
            >
              {name}
            </TreeItemLayout>
          </TreeItem>
        );
      })}
    </Tree>
  );
};
