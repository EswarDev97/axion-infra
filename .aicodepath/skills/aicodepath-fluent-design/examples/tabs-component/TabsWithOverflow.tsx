import * as React from 'react';
import {
  Tab,
  TabList,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  tokens,
  useOverflowMenu,
} from '@fluentui/react-components';
import {
  Overflow,
  OverflowItem,
  useIsOverflowItemVisible,
} from '@fluentui/react-overflow';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
    overflow: 'hidden',
  },
  tabList: {
    flex: 1,
    minWidth: 0,
  },
});

// Individual tab item — hides via Overflow when no space
const OverflowTab: React.FC<{ id: string; label: string }> = ({ id, label }) => {
  const isVisible = useIsOverflowItemVisible(id);
  if (!isVisible) return null;

  return (
    <OverflowItem id={id}>
      <Tab value={id}>{label}</Tab>
    </OverflowItem>
  );
};

// Overflow menu button — appears when tabs don't fit
const OverflowMenuButton: React.FC<{ tabs: { id: string; label: string }[] }> = ({ tabs }) => {
  const { ref, overflowCount, isOverflowing } = useOverflowMenu<HTMLButtonElement>();

  if (!isOverflowing) return null;

  return (
    <Menu>
      <MenuTrigger>
        {/* role="tab" required for WAI-ARIA conformance inside TabList */}
        <MenuButton ref={ref} role="tab" size="small">
          +{overflowCount} more
        </MenuButton>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {tabs.map(tab => (
            <MenuItem key={tab.id}>{tab.label}</MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'components', label: 'Components' },
  { id: 'tokens', label: 'Design Tokens' },
  { id: 'motion', label: 'Motion' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'forms', label: 'Forms' },
  { id: 'testing', label: 'Testing' },
];

/**
 * TabsWithOverflow — Horizontal tabs with automatic overflow menu.
 *
 * Pattern: Overflow + OverflowItem wraps each tab.
 * When tabs don't fit, hidden tabs appear in an overflow MenuButton with role="tab".
 *
 * Key imports: Overflow, OverflowItem from @fluentui/react-overflow
 */
export const TabsWithOverflow: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = React.useState('overview');

  return (
    <Overflow minimumVisible={2}>
      <div className={styles.container}>
        <TabList
          className={styles.tabList}
          selectedValue={selectedTab}
          onTabSelect={(event, data) => setSelectedTab(data.value as string)}
        >
          {TABS.map(tab => (
            <OverflowTab key={tab.id} id={tab.id} label={tab.label} />
          ))}
          <OverflowMenuButton tabs={TABS} />
        </TabList>
      </div>
    </Overflow>
  );
};
