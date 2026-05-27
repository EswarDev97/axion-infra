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
  Field,
  Input,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
});

/**
 * DialogForm — Dialog containing a form with Field-wrapped inputs.
 *
 * Critical pattern: Place <form> between <DialogSurface> and <DialogBody>.
 * This ensures native form submission works with Enter key and type="submit" button.
 *
 * Always wrap inputs in <Field> — it auto-wires all ARIA:
 * - label → htmlFor
 * - hint → aria-describedby
 * - validationMessage → aria-describedby + aria-invalid
 */
export const DialogForm: React.FC = () => {
  const styles = useStyles();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [nameError, setNameError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNameError('Project name is required');
      return;
    }

    console.log('Project created:', { name, description });
    setName('');
    setDescription('');
    setNameError('');
  };

  return (
    <Dialog>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="primary">New project</Button>
      </DialogTrigger>

      <DialogSurface>
        {/* form placed between DialogSurface and DialogBody */}
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>Create project</DialogTitle>

            <DialogContent className={styles.form}>
              <Field
                label="Project name"
                required
                validationState={nameError ? 'error' : 'none'}
                validationMessage={nameError}
              >
                <Input
                  value={name}
                  onChange={(e, data) => {
                    setName(data.value);
                    if (data.value.trim()) setNameError('');
                  }}
                  placeholder="My project"
                />
              </Field>

              <Field
                label="Description"
                hint="Optional — describe what this project is for"
              >
                <Textarea
                  value={description}
                  onChange={(e, data) => setDescription(data.value)}
                  placeholder="Brief description"
                  rows={3}
                />
              </Field>
            </DialogContent>

            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button type="submit" appearance="primary">
                Create project
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
