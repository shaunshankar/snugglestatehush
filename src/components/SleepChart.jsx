import React, { useState } from 'react';
import { getLast30Days, formatShortDate, formatDuration } from '../utils/dateUtils.js';

const PADDING = { top: 20, right: 16, bottom: 48, left: 40 };
const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const INNER_W = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export default function SleepChart({ entries = [], targetHours = 8 }) {
  const [tooltip, setTooltip] = useState(null);

  const days = getLast30Days();
  const entryMap = {};
  for (const e of entries) {
    if (e.date) entryMap[e.date] = e;
  }

  const data = days.map((isoDate) => {
    const entry = entryMap[isoDate];
    return {
      isoDate,
      minutes: entry?.duration_minutes || 0,
      hasData: !!entry,
    };
  });

  const maxHours = Math.max(targetHours + 2, ...data.map((d) => d.minutes / 60), 10);
  const yScale = (hours) => INNER_H - (hours / maxHours) * INNER_H;
  const targetY = yScale(targetHours);

  const barWidth = Math.max(4, INNER_W / days.length - 3);

  const yTicks = [];
  for (let h = 0; h <= Math.ceil(maxHours); h += 2) {
    yTicks.push(h);
  }

  return (
    <div className="chart-container">
      <div className="chart-wrapper" style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-label="Sleep duration chart over the last 30 days"
        >
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#9b8ec4" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="1" />
              <stop offset="100%" stopColor="#9b8ec4" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Y axis ticks and gridlines */}
          {yTicks.map((h) => {
            const y = PADDING.top + yScale(h);
            return (
              <g key={h}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={PADDING.left + INNER_W}
                  y2={y}
                  stroke="rgba(155,142,196,0.1)"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-text"
                  fontSize="10"
                >
                  {h}h
                </text>
              </g>
            );
          })}

          {/* Target line */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + targetY}
            x2={PADDING.left + INNER_W}
            y2={PADDING.top + targetY}
            className="chart-target-line"
          />
          <text
            x={PADDING.left + INNER_W - 2}
            y={PADDING.top + targetY - 4}
            textAnchor="end"
            fontSize="9"
            fill="rgba(201,168,76,0.6)"
            fontFamily="Inter, sans-serif"
          >
            Goal {targetHours}h
          </text>

          {/* Bars */}
          {data.map((d, i) => {
            const hours = d.minutes / 60;
            const barH = Math.max(0, (hours / maxHours) * INNER_H);
            const xCenter = PADDING.left + (i / days.length) * INNER_W + INNER_W / days.length / 2;
            const x = xCenter - barWidth / 2;
            const y = PADDING.top + INNER_H - barH;
            const isHovered = tooltip?.index === i;

            return (
              <rect
                key={d.isoDate}
                x={x}
                y={d.hasData ? y : PADDING.top + INNER_H}
                width={barWidth}
                height={d.hasData ? barH : 0}
                rx="2"
                fill={isHovered ? 'url(#barGradHover)' : 'url(#barGrad)'}
                opacity={d.hasData ? 1 : 0}
                style={{ cursor: d.hasData ? 'pointer' : 'default', transition: 'opacity 0.2s' }}
                onMouseEnter={(e) => {
                  if (d.hasData) {
                    setTooltip({ index: i, isoDate: d.isoDate, minutes: d.minutes, x: xCenter, y });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* X axis date labels — show every 5th */}
          {data.map((d, i) => {
            if (i % 5 !== 0 && i !== data.length - 1) return null;
            const xCenter = PADDING.left + (i / days.length) * INNER_W + INNER_W / days.length / 2;
            const dd = new Date(d.isoDate + 'T00:00:00');
            const label = `${dd.getDate()}/${dd.getMonth() + 1}`;
            return (
              <text
                key={d.isoDate}
                x={xCenter}
                y={CHART_HEIGHT - 6}
                textAnchor="middle"
                className="chart-axis-text"
                fontSize="9"
              >
                {label}
              </text>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x - 45, CHART_WIDTH - PADDING.right - 90)}
                y={Math.max(PADDING.top + 4, tooltip.y - 42)}
                width={90}
                height={36}
                rx="6"
                fill="rgba(26,16,64,0.95)"
                stroke="rgba(155,142,196,0.4)"
                strokeWidth="1"
              />
              <text
                x={Math.min(tooltip.x, CHART_WIDTH - PADDING.right - 45)}
                y={Math.max(PADDING.top + 18, tooltip.y - 24)}
                textAnchor="middle"
                fontSize="9"
                fill="#c0c8d8"
                fontFamily="Inter, sans-serif"
              >
                {formatShortDate(tooltip.isoDate)}
              </text>
              <text
                x={Math.min(tooltip.x, CHART_WIDTH - PADDING.right - 45)}
                y={Math.max(PADDING.top + 30, tooltip.y - 12)}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#c9a84c"
                fontFamily="Inter, sans-serif"
              >
                {formatDuration(tooltip.minutes)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
