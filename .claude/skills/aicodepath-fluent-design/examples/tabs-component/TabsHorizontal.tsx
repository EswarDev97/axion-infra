import * as React from 'react';
import {
  Tab,
  TabList,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  panels: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
  },
});

/**
 * TabsHorizontal — Standard horizontal tab list.
 *
 * Rules:
 * - One tab always active on first render (set defaultSelectedValue)
 * - Consistent label format (text-only or text+icon, never mixed)
 * - Horizontal tabs do not scroll/wrap — use Overflow for many tabs
 */
export const TabsHorizontal: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = React.useState<string>('overview');

  return (
    <div className={styles.root}>
      <TabList
        defaultSelectedValue="overview"
        onTabSelect={(event, data) => setSelectedTab(data.value as string)}
      >
        <Tab value="overview">Overview</Tab>
        <Tab value="components">Components</Tab>
        <Tab value="tokens">Tokens</Tab>
        <Tab value="motion">Motion</Tab>
      </TabList>

      <div className={styles.panels}>
        {selectedTab === 'overview' && <p>Fluent 2 is Microsoft's design system.</p>}
        {selectedTab === 'components' && <p>46+ React components in @fluentui/react-components.</p>}
        {selectedTab === 'tokens' && <p>2-layer token system: global → alias via FluentProvider.</p>}
        {selectedTab === 'motion' && <p>Web Animations API via @fluentui/react-motion.</p>}
      </div>
    </div>
  );
};
