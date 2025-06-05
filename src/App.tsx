import { useState, useEffect, useCallback } from "react";
import "./App.css";

interface TimeEntry {
  type: "clock-in" | "clock-out";
  timestamp: string;
  duration?: string;
}

interface ClockState {
  isClockedIn: boolean;
  lastClockIn: string | null;
}

function App() {
  const [isClockedIn, setIsClockedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem("clockState");
    return saved ? JSON.parse(saved).isClockedIn : false;
  });

  const [lastClockIn, setLastClockIn] = useState<Date | null>(() => {
    const saved = localStorage.getItem("clockState");
    return saved && JSON.parse(saved).lastClockIn
      ? new Date(JSON.parse(saved).lastClockIn)
      : null;
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem("timeEntries");
    return saved ? JSON.parse(saved) : [];
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Save time entries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("timeEntries", JSON.stringify(timeEntries));
  }, [timeEntries]);

  // Save clock state to localStorage whenever it changes
  useEffect(() => {
    const clockState: ClockState = {
      isClockedIn,
      lastClockIn: lastClockIn?.toISOString() || null,
    };
    localStorage.setItem("clockState", JSON.stringify(clockState));
  }, [isClockedIn, lastClockIn]);

  const calculateDuration = useCallback((start: Date, end: Date): string => {
    const diff = Math.max(0, end.getTime() - start.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }, []);

  const getCurrentDuration = useCallback((): string => {
    if (!isClockedIn || !lastClockIn) return "0h 0m 0s";
    return calculateDuration(lastClockIn, currentTime);
  }, [isClockedIn, lastClockIn, currentTime, calculateDuration]);

  const playSound = useCallback((type: "in" | "out") => {
    const audio = new Audio(type === "in" ? "/clock-in.mp3" : "/clock-out.mp3");
    audio.play().catch(() => {
      // Handle autoplay restrictions
      console.log("Audio playback failed");
    });
  }, []);

  const handleClockAction = async () => {
    setIsAnimating(true);

    // Play sound effect
    playSound(isClockedIn ? "out" : "in");

    // Add animation delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const now = new Date();
    const newEntry: TimeEntry = {
      type: isClockedIn ? "clock-out" : "clock-in",
      timestamp: now.toLocaleString("en-US", {
        timeZone: "America/New_York",
      }),
    };

    if (isClockedIn && lastClockIn) {
      newEntry.duration = calculateDuration(lastClockIn, now);
    }

    setTimeEntries((prev) => [...prev, newEntry]);
    setIsClockedIn(!isClockedIn);

    if (!isClockedIn) {
      setLastClockIn(now);
    } else {
      setLastClockIn(null);
    }

    // Reset animation state
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <main className="container">
      <h1>MIE Clock</h1>

      <div className="clock-display">
        <div className="current-time">{formatTime(currentTime)} EST</div>
        <div className="duration">
          {isClockedIn
            ? `Current Session: ${getCurrentDuration()}`
            : "0h 0m 0s"}
        </div>
      </div>

      <button
        className={`clock-button ${
          isClockedIn ? "clocked-in" : "clocked-out"
        } ${isAnimating ? "animating" : ""}`}
        onClick={handleClockAction}
        disabled={isAnimating}
      >
        {isClockedIn ? "Clock Out" : "Clock In"}
      </button>
    </main>
  );
}

export default App;
