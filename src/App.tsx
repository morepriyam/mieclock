import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";

interface TimeEntry {
  type: "in" | "out";
  time: Date;
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
  const [selectedGuid, setSelectedGuid] = useState<string>(() => {
    return localStorage.getItem("selectedGuid") || "";
  });

  const [clockState, setClockState] = useState<"clocked in" | "clocked out">(
    () => {
      return (
        (localStorage.getItem("clockState") as "clocked in" | "clocked out") ||
        "clocked out"
      );
    }
  );
  const [showChatModal, setShowChatModal] = useState(false);
  const [availableChats, setAvailableChats] = useState<Chat[]>([]);
  const [selectedChatName, setSelectedChatName] = useState<string>(() => {
    return localStorage.getItem("selectedChatName") || "";
  });
  const [lastClockIn, setLastClockIn] = useState<Date | null>(() => {
    const saved = localStorage.getItem("lastClockIn");
    return saved ? new Date(saved) : null;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [clockEntries, setClockEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem("clockEntries");
    return saved ? JSON.parse(saved) : [];
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mieChats, setMieChats] = useState<
    Array<{ name: string; guid: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Save states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("selectedGuid", selectedGuid);
  }, [selectedGuid]);

  useEffect(() => {
    localStorage.setItem("clockState", clockState);
  }, [clockState]);

  useEffect(() => {
    localStorage.setItem("lastClockIn", lastClockIn?.toISOString() || "");
  }, [lastClockIn]);

  useEffect(() => {
    localStorage.setItem("clockEntries", JSON.stringify(clockEntries));
  }, [clockEntries]);

  useEffect(() => {
    localStorage.setItem("selectedChatName", selectedChatName);
    localStorage.setItem("selectedGuid", selectedGuid);
  }, [selectedChatName, selectedGuid]);

  const calculateDuration = useCallback((start: Date, end: Date): string => {
    const diff = Math.max(0, end.getTime() - start.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }, []);

  const getCurrentDuration = useCallback((): string => {
    if (clockState !== "clocked in" || !lastClockIn) return "0h 0m 0s";
    return calculateDuration(lastClockIn, currentTime);
  }, [clockState, lastClockIn, currentTime, calculateDuration]);

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
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDuration = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h${minutes}m`;
  };

  const handleClockAction = async () => {
    if (!selectedGuid) {
      alert("Please select a chat first!");
      return;
    }

    if (clockState === "clocked out") {
      // Clock in
      const now = new Date();
      setLastClockIn(now);
      setClockState("clocked in");
      setClockEntries((prev) => [...prev, { type: "in", time: now }]);
      setElapsedTime(0);

      // Send clock in message only when using the button
      try {
        const message = "Clock in";
        await invoke("send_imessage_to_chat", {
          guid: selectedGuid,
          message,
        });
      } catch (error) {
        console.error("Error sending clock-in message:", error);
      }
    } else {
      // Clock out - always send message
      const now = new Date();

      try {
        if (lastClockIn) {
          const message = `Clock out ${formatTime(lastClockIn)} - ${formatTime(
            now
          )} - ${formatDuration(lastClockIn, now)} - ${formatDate(now)}`;
          await invoke("send_imessage_to_chat", {
            guid: selectedGuid,
            message,
          });
        }
      } catch (error) {
        console.error("Error sending clock-out message:", error);
      }

      setClockState("clocked out");
      setClockEntries((prev) => [...prev, { type: "out", time: now }]);
    }
  };

  const handleSelectChat = async () => {
    try {
      console.log("Fetching MIE chats...");
      const result = await invoke<string>("get_mie_chats");
      console.log("Raw chat result from AppleScript:", result);

      // Split the result into lines and parse each chat
      const lines = result.split(/\r?\n/); // Handle both \r\n and \n
      console.log("Split into lines:", lines);

      const chats = lines
        .filter((line: string) => {
          const trimmed = line.trim();
          console.log("Processing line:", trimmed);
          return trimmed !== "";
        })
        .map((line: string) => {
          // Split by \r if the line contains multiple chats
          const chatLines = line.split("\r").filter((l) => l.trim() !== "");
          console.log("Chat lines in current line:", chatLines);

          return chatLines.map((chatLine) => {
            console.log("Parsing chat line:", chatLine);
            const match = chatLine.match(/Chat Name: (.*?) \| GUID: (.*)/);
            console.log("Match result:", match);
            if (match) {
              const chat = {
                name: match[1],
                guid: match[2],
              };
              console.log("Created chat object:", chat);
              return chat;
            }
            console.log("No match found for line");
            return null;
          });
        })
        .flat() // Flatten the array of arrays
        .filter((chat): chat is { name: string; guid: string } => {
          const isValid = chat !== null;
          console.log("Filtering chat:", chat, "isValid:", isValid);
          return isValid;
        });

      console.log("Final parsed chats:", chats);
      console.log("Number of parsed chats:", chats.length);
      setAvailableChats(chats);
      setShowChatModal(true);
    } catch (error) {
      console.error("Error getting MIE chats:", error);
    }
  };

  const handleChatSelect = (chat: { name: string; guid: string }) => {
    setSelectedGuid(chat.guid);
    setSelectedChatName(chat.name);
    localStorage.setItem("selectedGuid", chat.guid);
    localStorage.setItem("selectedChatName", chat.name);
    setShowChatModal(false);
  };

  // Load selected chat name from localStorage on startup
  useEffect(() => {
    const savedChatName = localStorage.getItem("selectedChatName");
    if (savedChatName) {
      setSelectedChatName(savedChatName);
    }
  }, []);

  return (
    <div className="app-container">
      <h1>MIE Clock</h1>

      <div className="clock-display">
        <div className="current-time">{formatTime(currentTime)} EST</div>
        <div className="duration">
          {clockState === "clocked in"
            ? `Current Session: ${getCurrentDuration()}`
            : "0h 0m 0s"}
        </div>
      </div>

      <div className="chat-selection">
        <button className="select-chat-button" onClick={handleSelectChat}>
          {selectedChatName || "Select MIE Chat"}
        </button>
      </div>

      <button
        className={`clock-button ${
          clockState === "clocked in" ? "clocked-in" : "clocked-out"
        } ${isAnimating ? "animating" : ""}`}
        onClick={handleClockAction}
        disabled={isAnimating}
      >
        {clockState === "clocked in" ? "Clock Out" : "Clock In"}
      </button>

      {showChatModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Select MIE Chat</h2>
            <div className="chat-list">
              {availableChats.map((chat) => (
                <button
                  key={chat.guid}
                  className="chat-option"
                  onClick={() => handleChatSelect(chat)}
                >
                  {chat.name}
                </button>
              ))}
            </div>
            <button
              className="close-button"
              onClick={() => setShowChatModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
