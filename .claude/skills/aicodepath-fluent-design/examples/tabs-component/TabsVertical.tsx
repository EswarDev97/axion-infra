import * as React from 'react';
import {
  Tab,
  TabList,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  GridRegular,
  PersonRegular,
  SettingsRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: tokens.spacingHorizontalL,
  },
  panels: {
    flex: 1,
    padding: tokens.spacingVerticalM,
    borderLeft: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
  },
});

/**
 * TabsVertical — Vertical tab list with icons.
 *
 * Use vertical tabs for:
 * - Navigation panels with many categories
 * - Settings panels
 * - Dashboard sidebars
 *
 * Icon rule: if any tab has an icon, ALL tabs should have an icon
 * (consistent format — never mix text-only and text+icon tabs).
 */
export const TabsVertical: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = React.useState<string>('dashboard');

  return (
    <div className={styles.root}>
      <TabList
        vertical
        defaultSelectedValue="dashboard"
        onTabSelect={(event, data) => setSelectedTab(data.value as string)}
      >
        <Tab value="dashboard" icon={<GridRegular />}>Dashboard</Tab>
        <Tab value="profile" icon={<PersonRegular />}>Profile</Tab>
        <Tab value="settings" icon={<SettingsRegular />}>Settings</Tab>
      </TabList>

      <div className={styles.panels}>
        {selectedTab === 'dashboard' && <p>Dashboard content goes here.</p>}
        {selectedTab === 'profile' && <p>User profile settings.</p>}
        {selectedTab === 'settings' && <p>Application settings.</p>}
      </div>
    </div>
  );
};
