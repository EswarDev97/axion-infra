import * as React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
} from '@fluentui/react-components';

/**
 * DialogConfirmation — Destructive action confirmation dialog.
 *
 * Rules:
 * - Alert variant (DialogBody modalType="alert") for destructive actions — dismissible by footer buttons only
 * - Title: verb + noun describing the consequence ("Delete project?" not "Confirmation")
 * - Primary action text matches the consequence ("Delete project" not "OK")
 * - Cancel always present; returns to previous state unchanged
 * - Focus enters first interactive element (Cancel, to reduce accidental destructive actions)
 */
export const DialogConfirmation: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  const handleDelete = () => {
    console.log('Project deleted');
    setOpen(false);
  };

  return (
    <>
      <Button
        appearance="primary"
        onClick={() => setOpen(true)}
      >
        Delete project
      </Button>

      <Dialog
        open={open}
        onOpenChange={(event, data) => setOpen(data.open)}
        modalType="alert"  // Alert: footer buttons only can dismiss
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogContent>
              This will permanently delete the project and all its data.
              This action cannot be undone.
            </DialogContent>
            <DialogActions>
              {/* Cancel first — reduces risk of accidental deletion */}
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleDelete}
                // In production: use colorScheme or custom styles for danger
              >
                Delete project
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
