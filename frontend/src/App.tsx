import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GameProvider, useGame } from "./context/GameContext";
import Arena from "./pages/Arena";
import Landing from "./pages/Landing";
import Lobby from "./pages/Lobby";

function RootRedirect() {
  const { auth, state } = useGame();

  if (!auth) {
    return <Navigate to="/" replace />;
  }

  if (state.room?.status === "active" || state.room?.status === "finished") {
    return <Navigate to="/arena" replace />;
  }

  return <Navigate to="/lobby" replace />;
}

function NotFoundRoute() {
  return <RootRedirect />;
}

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}
