{/* Pet Chef Ver B1.00 — 2026-06-22 */}
import React, { useEffect, useState } from 'react';

/**
 * StageProgressIndicator - Cooking progress indicator with 4 stages
 * Props: { stages, currentStage, estimatedSeconds, elapsedSeconds }
 * stages: [{ key, label }] - e.g. [{ key: 'load', label: '放入' }, ...]
 * currentStage: current stage key string
 * estimatedSeconds: total estimated time in seconds
 * elapsedSeconds: elapsed time in seconds (optional, will use internal timer if not provided)
 */
export default function StageProgressIndicator({
  stages: propStages,
  currentStage,
  estimatedSeconds = 0,
  elapsedSeconds: propElapsed,
}) {
  const stages = propStages || [
    { key: 'load', label: '放入食材' },
    { key: 'preheat', label: '预热' },
    { key: 'cook', label: '烹饪中' },
    { key: 'done', label: '完成' },
  ];

  // Internal timer if elapsedSeconds not controlled
  const [internalElapsed, setInternalElapsed] = useState(0);
  const elapsed = propElapsed !== undefined ? propElapsed : internalElapsed;

  useEffect(() => {
    if (propElapsed !== undefined) return; // controlled from outside
    if (!currentStage || currentStage === 'done') return;

    const timer = setInterval(() => {
      setInternalElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStage, propElapsed]);

  const remaining = Math.max(0, estimatedSeconds - elapsed);
  const remainingMin = Math.floor(remaining / 60);
  const remainingSec = remaining % 60;

  // Determine stage statuses
  const currentIdx = stages.findIndex(s => s.key === currentStage);

  return (
    <div style={styles.container}>
      {/* Stage Bar */}
      <div style={styles.barWrapper}>
        {/* Connecting line */}
        <div style={styles.connectorTrack} />
        <div
          style={{
            ...styles.connectorFill,
            width: `${Math.max(0, (currentIdx / (stages.length - 1)) * 100)}%`,
          }}
        />

        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIdx || currentStage === 'done';
          const isActive = idx === currentIdx && currentStage !== 'done';
          const isPending = idx > currentIdx && currentStage !== 'done';

          let dotStyle = styles.dotPending;
          let labelStyle = styles.labelPending;

          if (isCompleted) {
            dotStyle = styles.dotCompleted;
            labelStyle = styles.labelCompleted;
          } else if (isActive) {
            dotStyle = styles.dotActive;
            labelStyle = styles.labelActive;
          }

          return (
            <div key={stage.key} style={styles.stageCol}>
              <div style={{ ...styles.dot, ...dotStyle }}>
                {isCompleted ? (
                  <span style={styles.checkMark}>✓</span>
                ) : (
                  <span style={styles.dotNum}>{idx + 1}</span>
                )}
              </div>
              <span style={{ ...styles.stageLabel, ...labelStyle }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Countdown Timer */}
      {currentStage && currentStage !== 'done' && (
        <div style={styles.timer}>
          <span style={styles.timerIcon}>⏱️</span>
          <span style={styles.timerText}>
            预计剩余: {remainingMin}分{remainingSec.toString().padStart(2, '0')}秒
          </span>
        </div>
      )}

      {/* Elapsed time */}
      <div style={styles.elapsed}>
        已用时: {Math.floor(elapsed / 60)}分{(elapsed % 60).toString().padStart(2, '0')}秒
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 16px',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 'var(--space-lg)',
  },
  barWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    padding: '0 8px',
    marginBottom: '16px',
  },
  connectorTrack: {
    position: 'absolute',
    top: '18px',
    left: 'calc(12.5% + 18px)',
    right: 'calc(12.5% + 18px)',
    height: '3px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    zIndex: 0,
  },
  connectorFill: {
    position: 'absolute',
    top: '18px',
    left: 'calc(12.5% + 18px)',
    height: '3px',
    background: 'var(--color-success)',
    borderRadius: '2px',
    zIndex: 1,
    transition: 'width 0.5s ease',
  },
  stageCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 2,
    flex: 1,
  },
  dot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid transparent',
    transition: 'all 0.3s ease',
  },
  dotPending: {
    background: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    background: 'rgba(0,230,255,0.2)',
    borderColor: 'var(--color-primary)',
    boxShadow: '0 0 16px rgba(0,230,255,0.4)',
  },
  dotCompleted: {
    background: 'var(--color-success)',
    borderColor: 'var(--color-success)',
  },
  dotNum: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-text-secondary)',
  },
  checkMark: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#FFFFFF',
  },
  stageLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'center',
    transition: 'color 0.3s ease',
  },
  labelPending: {
    color: 'var(--color-text-tertiary)',
  },
  labelActive: {
    color: 'var(--color-primary)',
  },
  labelCompleted: {
    color: 'var(--color-success)',
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(0,230,255,0.08)',
    border: '1px solid rgba(0,230,255,0.15)',
    marginBottom: '8px',
  },
  timerIcon: {
    fontSize: '18px',
  },
  timerText: {
    color: 'var(--color-primary)',
    fontSize: '14px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  elapsed: {
    textAlign: 'center',
    color: 'var(--color-text-tertiary)',
    fontSize: '12px',
  },
};
