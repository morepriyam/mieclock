import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";

interface TimeEntry {
  type: "clock-in" | "clock-out";
  timestamp: string;
  duration?: string;
}

interface ClockState {
  isClockedIn: boolean;
  lastClockIn: string | null;
}

interface Chat {
  name: string;
  guid: string;
}

function App() {
  const [isClockedIn, setIsClockedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem("clockState");
    return saved ? JSON.parse(saved).isClockedIn : false;
  });

  const [selectedGuid, setSelectedGuid] = useState<string>(() => {
    return localStorage.getItem("selectedGuid") || "";
  });

  const [showChatModal, setShowChatModal] = useState(false);
  const [availableChats, setAvailableChats] = useState<Chat[]>([]);
  const [selectedChatName, setSelectedChatName] = useState<string>("");

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

  // Save GUID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("selectedGuid", selectedGuid);
  }, [selectedGuid]);

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

  const formatTime = (date: Date) => {
    return date
      .toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\s/g, "");
  };

  const formatDate = (date: Date) => {
    return date
      .toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "/");
  };

  const formatDuration = (start: Date, end: Date): string => {
    const diff = Math.max(0, end.getTime() - start.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h${minutes}m`;
  };

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

    // Send iMessage if GUID is set
    if (selectedGuid) {
      let message = "";
      if (isClockedIn) {
        // Clock out message
        if (lastClockIn) {
          const duration = formatDuration(lastClockIn, now);
          message = `Clock out ${formatTime(lastClockIn)} - ${formatTime(
            now
          )} - ${duration} - ${formatDate(now)}`;
        }
      } else {
        // Clock in message
        message = `Clock in`;
      }

      console.log(`Attempting to send iMessage to GUID: ${selectedGuid}`);
      console.log(`Message content: ${message}`);

      try {
        await invoke("send_imessage_to_chat", {
          guid: selectedGuid,
          message: message,
        });
        console.log("✅ iMessage sent successfully!");
      } catch (error) {
        console.error("❌ Failed to send iMessage:", error);
        console.error("Error details:", {
          guid: selectedGuid,
          message: message,
          error: error,
        });
      }
    } else {
      console.log("⚠️ No GUID provided, skipping iMessage send");
    }

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

  const handleSelectChat = async () => {
    try {
      const result = await invoke<string>("get_mie_chats");
      const chatLines = result.split("\n").filter((line) => line.trim() !== "");
      const chats = chatLines
        .map((line) => {
          const match = line.match(/Chat Name: (.*?) \| GUID: (.*)/);
          if (match) {
            return {
              name: match[1],
              guid: match[2],
            };
          }
          return null;
        })
        .filter((chat): chat is Chat => chat !== null);

      setAvailableChats(chats);
      setShowChatModal(true);
    } catch (error) {
      console.error("Failed to get MIE chats:", error);
    }
  };

  const handleChatSelection = (chat: Chat) => {
    setSelectedGuid(chat.guid);
    setSelectedChatName(chat.name);
    setShowChatModal(false);
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

      <div className="chat-selection">
        <button className="select-chat-button" onClick={handleSelectChat}>
          {selectedChatName ? `Selected: ${selectedChatName}` : "Select Chat"}
        </button>
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

      {showChatModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select MIE Chat</h2>
            <div className="chat-list">
              {availableChats.map((chat, index) => (
                <button
                  key={index}
                  className="chat-option"
                  onClick={() => handleChatSelection(chat)}
                >
                  {chat.name}
                </button>
              ))}
            </div>
            <button
              className="close-modal"
              onClick={() => setShowChatModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
