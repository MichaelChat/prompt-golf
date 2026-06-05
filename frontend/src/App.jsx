import { Routes, Route, Navigate } from 'react-router-dom';
import { Nav } from './components/Nav.jsx';
import { HomePage } from './pages/Home.jsx';
import { HolePage } from './pages/Hole.jsx';
import { GlobalLeaderboardPage } from './pages/GlobalLeaderboard.jsx';
import { AboutPage } from './pages/About.jsx';

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hole/:holeNumber" element={<HolePage />} />
        <Route path="/leaderboard" element={<GlobalLeaderboardPage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Legacy redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
