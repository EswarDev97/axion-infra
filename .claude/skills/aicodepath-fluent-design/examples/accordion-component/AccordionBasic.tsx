import * as React from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
} from '@fluentui/react-components';

/**
 * AccordionBasic — Default accordion behavior.
 * Opening one item collapses others (default: navigable, single expand).
 */
export const AccordionBasic: React.FC = () => {
  return (
    <Accordion>
      <AccordionItem value="1">
        <AccordionHeader>Getting started</AccordionHeader>
        <AccordionPanel>
          <p>Install the package and wrap your app with FluentProvider.</p>
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem value="2">
        <AccordionHeader>Component patterns</AccordionHeader>
        <AccordionPanel>
          <p>Every Fluent v9 component follows the 5-file pattern.</p>
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem value="3">
        <AccordionHeader>Design tokens</AccordionHeader>
        <AccordionPanel>
          <p>Always use alias tokens — never hardcoded hex values.</p>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
