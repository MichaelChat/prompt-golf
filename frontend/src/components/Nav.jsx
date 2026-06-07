import { Link, useLocation } from 'react-router-dom';
import { useUsername } from '../hooks/useUsername.js';
import styles from './Nav.module.css';

export function Nav() {
  const location = useLocation();
  const [username, setUsername] = useUsername();

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <span className={styles.logoIcon}>⛳</span>
        <span className={styles.logoText}>PromptGolf</span>
      </Link>

      <div className={styles.links}>
        <NavLink to="/" active={location.pathname === '/'}>Holes</NavLink>
        <NavLink to="/leaderboard" active={location.pathname === '/leaderboard'}>Leaderboard</NavLink>
        <NavLink to="/about" active={location.pathname === '/about'}>About</NavLink>
      </div>

      <div className={styles.account}>
        <div className={styles.usernameWrapper}>
          <input
            className={`${styles.usernameInput} ${!username.trim() ? styles.usernameEmpty : styles.usernameSet}`}
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="enter username"
            maxLength={32}
            aria-label="Your username"
          />
          {!username.trim() && (
            <span className={styles.usernameHint}>← required to submit</span>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} className={`${styles.link} ${active ? styles.active : ''}`}>
      {children}
    </Link>
  );
}
