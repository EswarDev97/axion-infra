import * as React from 'react';
import {
  Button,
  FluentProvider,
  makeStyles,
  tokens,
  webLightTheme,
} from '@fluentui/react-components';
import {
  createPresenceComponent,
  createMotionComponent,
  createPresenceComponentVariant,
  motionTokens,
} from '@fluentui/react-motion';

/**
 * presence-motion.tsx — Motion system examples.
 *
 * Three primitive types:
 * 1. createPresenceComponent — enter/exit with React mount/unmount control
 * 2. createMotionComponent   — non-presence continuous animations
 * 3. createPresenceComponentVariant — compose from pre-built atom functions
 *
 * Easing rules:
 * - curveDecelerateMid (ease-out) → entering elements
 * - curveAccelerateMid (ease-in)  → exiting elements
 * - curveEasyEase (ease-in-out)   → movement within screen
 * - curveLinear                   → rotations only
 *
 * Exit duration should be shorter than enter (feels snappy).
 * createPresenceComponent handles prefers-reduced-motion automatically.
 */

// 1. Fade — simplest enter/exit
const Fade = createPresenceComponent({
  enter: {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    duration: motionTokens.durationNormal,     // 200ms
    easing: motionTokens.curveDecelerateMid,   // ease-out: entering
  },
  exit: {
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    duration: motionTokens.durationFast,       // 100ms (exit = shorter)
    easing: motionTokens.curveAccelerateMid,   // ease-in: exiting
  },
});

// 2. Slide from top (e.g., toast notification entrance)
const SlideFromTop = createPresenceComponent({
  enter: {
    keyframes: [
      { opacity: 0, transform: 'translateY(-16px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    duration: motionTokens.durationNormal,
    easing: motionTokens.curveDecelerateMid,
  },
  exit: {
    keyframes: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-8px)' },
    ],
    duration: motionTokens.durationFast,
    easing: motionTokens.curveAccelerateMid,
  },
});

// 3. Scale + Fade (dialog entrance)
const ScaleFade = createPresenceComponent({
  enter: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    duration: motionTokens.durationNormal,
    easing: motionTokens.curveDecelerateMid,
  },
  exit: {
    keyframes: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.95)' },
    ],
    duration: motionTokens.durationFast,
    easing: motionTokens.curveAccelerateMid,
  },
});

// 4. Continuous pulse (badge notification indicator)
const Pulse = createMotionComponent({
  keyframes: [
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(1.15)', opacity: 0.8 },
  ],
  duration: motionTokens.durationSlow,   // 300ms
  iterations: Infinity,
  direction: 'alternate',
  easing: motionTokens.curveEasyEase,
});

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingVerticalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  controls: { display: 'flex', gap: tokens.spacingHorizontalS },
  box: {
    padding: tokens.spacingVerticalM,
    background: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: tokens.borderRadiusCircular,
    background: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
});

export const PresenceMotionDemo: React.FC = () => {
  const styles = useStyles();
  const [showFade, setShowFade] = React.useState(true);
  const [showSlide, setShowSlide] = React.useState(false);
  const [showScale, setShowScale] = React.useState(false);

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.root}>

        {/* Fade */}
        <div className={styles.section}>
          <div className={styles.controls}>
            <Button size="small" onClick={() => setShowFade(v => !v)}>
              Toggle Fade
            </Button>
          </div>
          <Fade visible={showFade} unmountOnExit>
            <div className={styles.box}>Fade enter/exit (200ms in, 100ms out)</div>
          </Fade>
        </div>

        {/* Slide from top */}
        <div className={styles.section}>
          <div className={styles.controls}>
            <Button size="small" onClick={() => setShowSlide(v => !v)}>
              Toggle Slide from top
            </Button>
          </div>
          <SlideFromTop visible={showSlide} unmountOnExit>
            <div className={styles.box}>Slide from top (toast notification pattern)</div>
          </SlideFromTop>
        </div>

        {/* Scale + Fade */}
        <div className={styles.section}>
          <div className={styles.controls}>
            <Button size="small" onClick={() => setShowScale(v => !v)}>
              Toggle Scale + Fade
            </Button>
          </div>
          <ScaleFade visible={showScale} unmountOnExit>
            <div className={styles.box}>Scale + Fade (dialog entrance pattern)</div>
          </ScaleFade>
        </div>

        {/* Continuous pulse */}
        <div className={styles.section}>
          <p>Pulse (continuous — createMotionComponent):</p>
          <Pulse>
            <span className={styles.badge}>3</span>
          </Pulse>
        </div>

      </div>
    </FluentProvider>
  );
};
