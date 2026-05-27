import * as React from 'react';
import {
  Button,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  SaveRegular,
  DeleteRegular,
  InfoRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

/**
 * TooltipUsage — Demonstrates both relationship types for Tooltip.
 *
 * relationship prop (required):
 * - "label": tooltip IS the accessible name (use when button has no other label)
 * - "description": tooltip supplements the accessible name (use with visible text)
 *
 * Content rules:
 * - Unlabeled components: simple noun phrase; no end punctuation
 * - Enabled components needing explanation: describe what it does
 * - Disabled components: explain what would enable it
 * - End punctuation only if tooltip contains a complete sentence
 *
 * vs Popover: Popover for rich/formatted/interactive content
 */
export const TooltipUsage: React.FC = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      {/* relationship="label" — tooltip IS the accessible name */}
      {/* Use when the button has no visible text label */}
      <Tooltip content="Save document" relationship="label">
        <Button
          appearance="subtle"
          icon={<SaveRegular />}
          aria-label="Save document"  // always provide aria-label on icon-only buttons
        />
      </Tooltip>

      {/* relationship="label" on disabled button — explains why disabled */}
      <Tooltip
        content="Select items to enable delete"
        relationship="label"
      >
        <Button
          appearance="subtle"
          icon={<DeleteRegular />}
          disabled
          aria-label="Delete selected items"
        />
      </Tooltip>

      {/* relationship="description" — tooltip supplements visible text */}
      {/* Use when the button already has a visible text label */}
      <Tooltip
        content="Opens a panel with additional configuration options."
        relationship="description"
      >
        <Button appearance="outline" icon={<InfoRegular />}>
          Advanced settings
        </Button>
      </Tooltip>
    </div>
  );
};
