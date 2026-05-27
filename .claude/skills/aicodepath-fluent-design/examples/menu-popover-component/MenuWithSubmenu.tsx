import * as React from 'react';
import {
  Button,
  Menu,
  MenuDivider,
  MenuItem,
  MenuItemCheckbox,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
} from '@fluentui/react-components';
import {
  CopyRegular,
  CutRegular,
  DeleteRegular,
  PasteRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  trigger: { display: 'inline-block' },
});

/**
 * MenuWithSubmenu — Context menu with submenu, checkbox, and radio items.
 *
 * Architecture: MenuTrigger → MenuPopover → MenuList → MenuItem variants
 *
 * Item types:
 * - MenuItem: standard action
 * - MenuItemCheckbox: multi-select filtering state (checkedValues + onCheckedValueChange)
 * - MenuItemRadio: single-select settings state
 * - MenuDivider: visual separator
 *
 * Rules:
 * - Frequent actions first, dangerous actions last
 * - Max 300px width; labels wrap (keep brief)
 * - Keyboard: Arrow keys (navigate), Enter (activate), Escape (close)
 */
export const MenuWithSubmenu: React.FC = () => {
  const styles = useStyles();
  const [checkedValues, setCheckedValues] = React.useState<Record<string, string[]>>({
    view: ['grid'],
  });
  const [sortOrder, setSortOrder] = React.useState<Record<string, string[]>>({
    sort: ['name'],
  });

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button className={styles.trigger}>Right-click menu</Button>
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          {/* Standard actions */}
          <MenuItem icon={<CutRegular />}>Cut</MenuItem>
          <MenuItem icon={<CopyRegular />}>Copy</MenuItem>
          <MenuItem icon={<PasteRegular />}>Paste</MenuItem>

          <MenuDivider />

          {/* Checkbox items — multi-select filtering */}
          <MenuItemCheckbox
            name="view"
            value="grid"
            checked={checkedValues.view?.includes('grid')}
          >
            Grid view
          </MenuItemCheckbox>
          <MenuItemCheckbox
            name="view"
            value="list"
            checked={checkedValues.view?.includes('list')}
          >
            List view
          </MenuItemCheckbox>

          <MenuDivider />

          {/* Nested submenu */}
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuItem>Sort by</MenuItem>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {/* Radio items — single-select settings */}
                <MenuItemRadio name="sort" value="name">Name</MenuItemRadio>
                <MenuItemRadio name="sort" value="date">Date modified</MenuItemRadio>
                <MenuItemRadio name="sort" value="size">Size</MenuItemRadio>
              </MenuList>
            </MenuPopover>
          </Menu>

          <MenuDivider />

          {/* Dangerous action last */}
          <MenuItem icon={<DeleteRegular />}>Delete</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
