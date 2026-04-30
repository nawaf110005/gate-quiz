'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RotatingText({
  texts = [],
  rotationInterval = 2000,
  initial = { y: '100%', opacity: 0 },
  animate = { y: 0, opacity: 1 },
  exit = { y: '-120%', opacity: 0 },
  transition = { type: 'spring', damping: 25, stiffness: 300 },
  staggerDuration = 0.03,
  staggerFrom = 'first',
  splitBy = 'words',
  mainClassName = '',
  splitLevelClassName = '',
  elementLevelClassName = '',
  style = {},
  loop = true,
  auto = true,
  onNext,
  animatePresenceMode = 'wait',
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!auto || texts.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = loop ? (prev + 1) % texts.length : Math.min(prev + 1, texts.length - 1);
        onNext?.(next);
        return next;
      });
    }, rotationInterval);
    return () => clearInterval(timerRef.current);
  }, [auto, loop, rotationInterval, texts.length, onNext]);

  const currentText = texts[index] ?? '';

  const units = splitBy === 'characters'
    ? currentText.split('')
    : splitBy === 'lines'
    ? currentText.split('\n')
    : currentText.split(' ');

  const getDelay = (i, total) => {
    if (staggerFrom === 'center') {
      const center = (total - 1) / 2;
      return Math.abs(i - center) * staggerDuration;
    }
    if (staggerFrom === 'last') return (total - 1 - i) * staggerDuration;
    return i * staggerDuration;
  };

  return (
    <span className={mainClassName} style={style}>
      <AnimatePresence mode={animatePresenceMode}>
        <motion.span
          key={index}
          style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center' }}
          className={splitLevelClassName}
        >
          {units.map((unit, i) => (
            <motion.span
              key={i}
              className={elementLevelClassName}
              initial={initial}
              animate={animate}
              exit={exit}
              transition={{ ...transition, delay: getDelay(i, units.length) }}
              style={{ display: 'inline-block', whiteSpace: 'pre' }}
            >
              {unit}{splitBy === 'words' && i < units.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
