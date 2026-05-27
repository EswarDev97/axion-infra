import * as React from 'react';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
} from '@fluentui/react-components';
import {
  FolderRegular,
  DocumentRegular,
} from '@fluentui/react-icons';

/**
 * TreeBasic — Static tree with nested hierarchy.
 *
 * Item types:
 * - Branch: parentNode — has itemType="branch", contains nested TreeItems
 * - Leaf: childOnly — has itemType="leaf", no children
 *
 * Indentation: 24px (medium), 12px (small). Leaves get extra 24px (no chevron).
 *
 * Accessibility:
 * - aria-label is REQUIRED on the Tree element
 * - Quick actions must also be available via toolbar or menu (WAI-ARIA)
 */
export const TreeBasic: React.FC = () => {
  return (
    <Tree aria-label="File explorer">
      {/* Branch: parent node with children */}
      <TreeItem itemType="branch" value="src">
        <TreeItemLayout iconBefore={<FolderRegular />}>
          src
        </TreeItemLayout>
        <Tree>
          <TreeItem itemType="branch" value="components">
            <TreeItemLayout iconBefore={<FolderRegular />}>
              components
            </TreeItemLayout>
            <Tree>
              <TreeItem itemType="leaf" value="Button.tsx">
                <TreeItemLayout iconBefore={<DocumentRegular />}>
                  Button.tsx
                </TreeItemLayout>
              </TreeItem>
              <TreeItem itemType="leaf" value="Input.tsx">
                <TreeItemLayout iconBefore={<DocumentRegular />}>
                  Input.tsx
                </TreeItemLayout>
              </TreeItem>
            </Tree>
          </TreeItem>

          <TreeItem itemType="leaf" value="index.ts">
            <TreeItemLayout iconBefore={<DocumentRegular />}>
              index.ts
            </TreeItemLayout>
          </TreeItem>
        </Tree>
      </TreeItem>

      <TreeItem itemType="leaf" value="package.json">
        <TreeItemLayout iconBefore={<DocumentRegular />}>
          package.json
        </TreeItemLayout>
      </TreeItem>
    </Tree>
  );
};
