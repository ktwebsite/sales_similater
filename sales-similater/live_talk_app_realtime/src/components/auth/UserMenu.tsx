import { useAuth } from '../../contexts/AuthContext';
import './UserMenu.scss';

export default function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="user-menu">
      <div className="user-info">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar-placeholder">
            {user.email?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="user-name">{user.displayName || user.email}</span>
      </div>
      <button onClick={logout} className="logout-btn">
        ログアウト
      </button>
    </div>
  );
}
