import * as React from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionToggleEventHandler,
} from '@fluentui/react-components';

/**
 * AccordionControlled — Controlled accordion with openItems state.
 * Use when you need to programmatically control which panels are open.
 *
 * Key props:
 * - openItems: current open item value(s)
 * - onToggle: fired when user toggles an item
 */
export const AccordionControlled: React.FC = () => {
  const [openItems, setOpenItems] = React.useState<string[]>(['1']);

  const handleToggle: AccordionToggleEventHandler<string> = (event, data) => {
    setOpenItems(data.openItems);
  };

  return (
    <div>
      <p>Open panels: {openItems.join(', ') || 'none'}</p>

      <Accordion
        multiple
        collapsible
        openItems={openItems}
        onToggle={handleToggle}
      >
        <AccordionItem value="1">
          <AccordionHeader>Panel 1</AccordionHeader>
          <AccordionPanel>
            <p>This panel starts open (controlled by openItems state).</p>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem value="2">
          <AccordionHeader>Panel 2</AccordionHeader>
          <AccordionPanel>
            <p>Toggle this panel and watch the state update above.</p>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem value="3">
          <AccordionHeader>Panel 3 (disabled)</AccordionHeader>
          <AccordionPanel>
            <p>This content would be in panel 3.</p>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <button onClick={() => setOpenItems([])}>Close all</button>
      <button onClick={() => setOpenItems(['1', '2', '3'])}>Open all</button>
    </div>
  );
};
