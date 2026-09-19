import React, { useState, useEffect } from "react";
import HostView from "./components/HostView";
import PlayerView from "./components/PlayerView";

export default function App() {
  // Comprobamos si en la URL está el parámetro ?host=true o el hash #host
  const isHostUrl =
    window.location.search.includes("host") ||
    window.location.hash.includes("host");
  const [isHost, setIsHost] = useState(isHostUrl);

  useEffect(() => {
    const handleHashChange = () => {
      setIsHost(
        window.location.search.includes("host") ||
          window.location.hash.includes("host"),
      );
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const toggleHost = () => {
    if (!isHost) {
      window.location.hash = "host";
      setIsHost(true);
    } else {
      window.location.hash = "";
      setIsHost(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {isHost ? <HostView /> : <PlayerView onSwitchToHost={toggleHost} />}
    </div>
  );
}
