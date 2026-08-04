import { useState, useEffect, useRef } from "react";
import "./DatePicker.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getInitialView = (val) => {
  const d = val ? new Date(`${val}T00:00:00`) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return [now.getFullYear(), now.getMonth()];
  }
  return [d.getFullYear(), d.getMonth()];
};

export default function DatePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const todayStr = getTodayStr();
  const [viewYear, setViewYear] = useState(() => getInitialView(value)[0]);
  const [viewMonth, setViewMonth] = useState(() => getInitialView(value)[1]);
  const [prevValue, setPrevValue] = useState(value);
  const containerRef = useRef(null);

  if (value !== prevValue) {
    setPrevValue(value);
    const [y, m] = getInitialView(value);
    setViewYear(y);
    setViewMonth(m);
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const prevMonth = () => {
    let y = viewYear;
    let m = viewMonth - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const nextMonth = () => {
    let y = viewYear;
    let m = viewMonth + 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const selectDate = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const isSameDate = (day) => {
    if (!value) return false;
    const d = new Date(`${value}T00:00:00`);
    return (
      d.getFullYear() === viewYear &&
      d.getMonth() === viewMonth &&
      d.getDate() === day
    );
  };

  const isToday = (day) => {
    const now = new Date();
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === day
    );
  };

  let cells = [];
  if (viewYear !== null && viewMonth !== null) {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  }

  const monthName = new Date(viewYear || 0, viewMonth || 0, 1).toLocaleString(
    "en-US",
    { month: "long" }
  );

  return (
    <div className="date-picker" ref={containerRef}>
      <div className="date-input-wrap">
        <input
          type="date"
          value={value}
          max={todayStr}
          onChange={(e) => {
            if (e.target.value && e.target.value > todayStr) return;
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="date-input"
        />
        <button
          type="button"
          className="calendar-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Open calendar"
        >
          📅
        </button>
      </div>

      {open && (
        <div className="calendar-popup">
          <div className="calendar-header">
            <button type="button" onClick={prevMonth} className="calendar-nav">
              ‹
            </button>
            <div className="calendar-month-label">
              {monthName} {viewYear}
            </div>
            <button type="button" onClick={nextMonth} className="calendar-nav">
              ›
            </button>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="calendar-weekday">
                {wd}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="calendar-day empty" />;
              }
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isFuture = dateStr > todayStr;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture}
                  className={`calendar-day ${
                    isToday(day) ? "today" : ""
                  } ${isSameDate(day) ? "selected" : ""} ${
                    isFuture ? "disabled" : ""
                  }`}
                  onClick={() => selectDate(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
