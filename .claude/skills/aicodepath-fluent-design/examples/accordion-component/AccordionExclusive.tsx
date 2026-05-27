import * as React from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
} from '@fluentui/react-components';

/**
 * AccordionExclusive — Multiple panels can be open simultaneously.
 * Use `multiple` prop when content does not need cross-referencing.
 * Use `collapsible` to allow all panels to be closed.
 */
export const AccordionExclusive: React.FC = () => {
  return (
    <Accordion multiple collapsible>
      <AccordionItem value="1">
        <AccordionHeader>Installation</AccordionHeader>
        <AccordionPanel>
          <pre>npm install @fluentui/react-components @fluentui/tokens</pre>
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem value="2">
        <AccordionHeader>Configuration</AccordionHeader>
        <AccordionPanel>
          <p>Wrap your app root with FluentProvider and a theme.</p>
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem value="3">
        <AccordionHeader>Usage</AccordionHeader>
        <AccordionPanel>
          <p>Import components from the umbrella @fluentui/react-components package.</p>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
