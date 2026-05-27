import * as React from 'react';
import {
  Button,
  Field,
  FluentProvider,
  Input,
  RadioGroup,
  Radio,
  Select,
  Switch,
  Textarea,
  makeStyles,
  tokens,
  webLightTheme,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '480px',
    padding: tokens.spacingVerticalL,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

/**
 * field-validation.tsx — All 4 Field validation states with every input type.
 *
 * Field ARIA auto-wiring (why Field is mandatory):
 * - label prop    → htmlFor on the input
 * - hint prop     → aria-describedby
 * - validationMessage → aria-describedby + aria-invalid="true" (on error)
 * - required prop → aria-required="true"
 *
 * Validation states:
 * - 'none'    → default (no icon, no color)
 * - 'success' → green checkmark
 * - 'warning' → yellow warning triangle
 * - 'error'   → red error icon + aria-invalid="true"
 */
export const FieldValidationDemo: React.FC = () => {
  const styles = useStyles();
  const [email, setEmail] = React.useState('');
  const [emailState, setEmailState] = React.useState<'none' | 'success' | 'error'>('none');
  const [emailMsg, setEmailMsg] = React.useState('');

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailState('error');
      setEmailMsg('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(value)) {
      setEmailState('error');
      setEmailMsg('Enter a valid email address');
    } else {
      setEmailState('success');
      setEmailMsg('Email is available');
    }
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <form className={styles.form} onSubmit={e => e.preventDefault()}>

        {/* none — default state */}
        <Field label="Username" hint="3–20 characters, letters and numbers only">
          <Input placeholder="johndoe" />
        </Field>

        {/* error — with validation */}
        <Field
          label="Email address"
          required
          validationState={emailState}
          validationMessage={emailMsg}
        >
          <Input
            type="email"
            value={email}
            onChange={(e, data) => setEmail(data.value)}
            onBlur={() => validateEmail(email)}
            placeholder="you@example.com"
          />
        </Field>

        {/* warning — valid but needs attention */}
        <Field
          label="Password"
          validationState="warning"
          validationMessage="Password is weak — add numbers and special characters"
          hint="Minimum 8 characters"
        >
          <Input type="password" />
        </Field>

        {/* success — confirmed valid */}
        <Field
          label="Display name"
          validationState="success"
          validationMessage="This name is available"
        >
          <Input defaultValue="Alice Johnson" />
        </Field>

        {/* Textarea in Field */}
        <Field label="Bio" hint="Tell us about yourself (optional)">
          <Textarea placeholder="I work on..." rows={3} />
        </Field>

        {/* RadioGroup in Field */}
        <Field label="Notification frequency" required>
          <RadioGroup defaultValue="daily">
            <Radio value="realtime" label="Real-time" />
            <Radio value="daily" label="Daily digest" />
            <Radio value="weekly" label="Weekly summary" />
            <Radio value="never" label="Never" />
          </RadioGroup>
        </Field>

        {/* Select in Field */}
        <Field label="Time zone" required>
          <Select>
            <option value="">Select a time zone</option>
            <option value="utc">UTC</option>
            <option value="est">Eastern (UTC-5)</option>
            <option value="pst">Pacific (UTC-8)</option>
          </Select>
        </Field>

        {/* Switch in Field */}
        <Field label="Email notifications">
          <Switch label="Enabled" defaultChecked />
        </Field>

        <div className={styles.actions}>
          <Button type="submit" appearance="primary">Save profile</Button>
          <Button appearance="secondary">Cancel</Button>
        </div>
      </form>
    </FluentProvider>
  );
};
