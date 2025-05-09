import React, { useEffect, useState, createContext, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Added CSS import for toastify

axios.defaults.baseURL = 'http://localhost:5000/api';

const AuthContext = createContext();

const authStorageKey = 'diceyAuth';

// Helper API instance with token added automatically
const api = axios.create();
api.interceptors.request.use(config => {
  const token = localStorage.getItem(authStorageKey);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// AuthProvider to manage login state
function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem(authStorageKey);
    return { token, email: null };
  });

  // Fetch profile email if token present (optional)
  useEffect(() => {
    if (auth.token && !auth.email) {
      // Could add /me endpoint but skipping for brevity
      setAuth(auth => ({ ...auth, email: 'You' }));
    }
  }, [auth.token, auth.email]);

  const login = (token, email) => {
    localStorage.setItem(authStorageKey, token);
    setAuth({ token, email });
  };

  const logout = () => {
    localStorage.removeItem(authStorageKey);
    setAuth({ token: null, email: null });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used in AuthProvider');
  return context;
}

// Protected route wrapper
function PrivateRoute({ children }) {
  const { auth } = useAuth();
  if (!auth.token) return <Navigate to="/login" replace />;
  return children;
}

// Login page
function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/auth/login', { email, password });
      login(data.token, data.email);
      toast.success('Logged in!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.centered}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

// Signup page
function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/auth/signup', { email, password });
      login(data.token, data.email);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.centered}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Creating...' : 'Sign up'}
        </button>
        <p>
          Have account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

// Home page after login - room create / join / past decisions links
function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomMaxP, setNewRoomMaxP] = useState('');

  async function createRoom() {
    if (!newRoomTitle.trim()) return toast.error('Room title is required');
    setCreating(true);
    try {
      const payload = {
        title: newRoomTitle.trim(),
        description: newRoomDesc.trim(),
        maxParticipants: newRoomMaxP ? Number(newRoomMaxP) : 0
      };
      const { data } = await api.post('/rooms', payload);
      toast.success('Room created! Redirecting...');
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom() {
    const code = roomCodeInput.trim();
    if (!code) return toast.error('Enter room code');
    try {
      await api.post('/rooms/join', { roomCode: code.toUpperCase() });
      toast.success('Joined room! Redirecting...');
      navigate(`/room/${code.toUpperCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room');
    }
  }

  return (
    <div style={{ ...styles.centered, maxWidth: 400, padding: 15 }}>
      <h1>DiceyDecisions</h1>
      <button onClick={logout} style={styles.buttonRed}>
        Logout
      </button>
      <hr style={{ width: '100%', margin: '20px 0' }} />
      <h3>Create Decision Room</h3>
      <input
        placeholder="Room Title"
        value={newRoomTitle}
        onChange={e => setNewRoomTitle(e.target.value)}
        style={styles.input}
      />
      <textarea
        placeholder="Description (optional)"
        value={newRoomDesc}
        onChange={e => setNewRoomDesc(e.target.value)}
        style={{ ...styles.input, height: 60 }}
      />
      <input
        type="number"
        min={0}
        placeholder="Max Participants (0 = no limit)"
        value={newRoomMaxP}
        onChange={e => setNewRoomMaxP(e.target.value)}
        style={styles.input}
      />
      <button onClick={createRoom} disabled={creating} style={styles.button}>
        {creating ? 'Creating...' : 'Create Room'}
      </button>

      <hr style={{ width: '100%', margin: '20px 0' }} />

      <h3>Join a Room</h3>
      <input
        placeholder="Enter Room Code"
        value={roomCodeInput}
        onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
        style={styles.input}
      />
      <button onClick={joinRoom} style={styles.button}>
        Join Room
      </button>

      <hr style={{ width: '100%', margin: '20px 0' }} />

      <Link to="/past-decisions" style={{ fontSize: 18, color: '#007bff', cursor: 'pointer' }}>
        View Past Decisions
      </Link>
    </div>
  );
}
// Room page with options submission, voting, results, tiebreaker UI
function Room() {
  const { roomCode } = useParams();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [options, setOptions] = useState([]);
  const [optionText, setOptionText] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [voteCasting, setVoteCasting] = useState(false);
  const [votingClosing, setVotingClosing] = useState(false);
  const [tiebreakerMethod, setTiebreakerMethod] = useState('');
  const [tiedOptionIds, setTiedOptionIds] = useState([]);
  const [tiebreaking, setTiebreaking] = useState(false);
  const [finalOptionText, setFinalOptionText] = useState(null);
  const [shareLink, setShareLink] = useState('');

  const isCreator = room?.creatorId === auth.email || false;

  // Use useCallback to memoize loadRoom to avoid unnecessary re-creation and safe to include in dependencies
  const loadRoom = useCallback(async () => {
    try {
      const { data } = await api.get(`/rooms/code/${roomCode}`);
      setRoom(data.room);
      setOptions(data.options);
      setHasVoted(data.hasVoted);
      if (data.room.finalDecision?.optionId) {
        const found = data.options.find(o => o._id === data.room.finalDecision.optionId);
        setFinalOptionText(found ? found.text : '');
      } else {
        setFinalOptionText(null);
      }
      setShareLink(`${window.location.origin}/room/${roomCode}`);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load room data');
      setLoading(false);
    }
  }, [roomCode]);

  // Initial load with correct useEffect dependencies
  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Polling options & voting status every 5 seconds
  useEffect(() => {
    if (!room || !room.votingOpen) return;
    const interval = setInterval(loadRoom, 5000);
    return () => clearInterval(interval);
  }, [room, loadRoom]);

  // Submit option (only when voting not open)
  async function submitOption() {
    if (!optionText.trim()) return toast.error('Enter option text');
    try {
      await api.post(`/rooms/${room._id}/options`, { text: optionText.trim() });
      toast.success('Option added!');
      setOptionText('');
      await loadRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add option');
    }
  }

  // Open voting (creator only)
  async function openVoting() {
    if (!room) return;
    try {
      await api.post(`/rooms/${room._id}/open-voting`);
      toast.success('Voting opened!');
      await loadRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open voting');
    }
  }

  // Cast vote
  async function vote() {
    if (!selectedOptionId) return toast.error('Select an option to vote');
    setVoteCasting(true);
    try {
      await api.post(`/rooms/${room._id}/vote`, { optionId: selectedOptionId });
      toast.success('Vote cast!');
      setHasVoted(true);
      await loadRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to vote');
    } finally {
      setVoteCasting(false);
    }
  }

  // Close voting (creator only)
  async function closeVoting() {
    if (!room) return;
    setVotingClosing(true);
    try {
      const { data } = await api.post(`/rooms/${room._id}/close-voting`);
      toast.success('Voting closed!');
      if (data.tie) {
        setTiedOptionIds(data.tiedOptionIds);
        toast.info("It's a tie! Please choose a tiebreaker.");
      } else {
        toast.info('Decision made!');
        await loadRoom();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close voting');
    } finally {
      setVotingClosing(false);
    }
  }

  // Trigger tiebreaker
  async function triggerTiebreaker(method) {
    if (!room) return;
    setTiebreaking(true);
    setTiebreakerMethod(method);
    try {
      const { data } = await api.post(`/rooms/${room._id}/tiebreaker`, { method, tiedOptionIds });
      const winnerOpt = options.find(o => o._id === data.winnerOptionId);
      setFinalOptionText(winnerOpt?.text || 'Unknown');
      toast.success(`${method} tiebreaker done! Winner: ${winnerOpt?.text || 'N/A'}`);
      setTiedOptionIds([]);
      await loadRoom();
    } catch (err) {
		      toast.error(err.response?.data?.message || 'Failed to trigger tiebreaker');
		    } finally {
		      setTiebreaking(false);
		      setTiebreakerMethod('');
		    }
		  }

		  if (loading) return <div style={styles.centered}>Loading room...</div>;
		  if (!room) return <div style={styles.centered}>Room not found</div>;

		  return (
		    <div style={styles.container}>
		      <h2>{room.title}</h2>
		      {room.description && <p style={{ color: '#555' }}>{room.description}</p>}
		      <p>Room Code: <b>{roomCode}</b></p>
		      <p>
		        Shareable Link:{' '}
		        <input type="text" readOnly value={shareLink} style={styles.shareInput} onFocus={e => e.target.select()} />
		      </p>
		      {!room.votingOpen && !hasVoted && (
		        <>
		          <h3>Submit Options</h3>
		          <input
		            placeholder="Option text"
		            value={optionText}
		            onChange={e => setOptionText(e.target.value)}
		            style={styles.inputShort}
		          />
		          <button onClick={submitOption} style={styles.button}>
		            Add Option
		          </button>
		        </>
		      )}

		      <h3>Options</h3>
		      {options.length === 0 && <p>No options submitted yet.</p>}

		      <ul style={styles.optionList}>
		        {options.map(opt => (
		          <li key={opt._id} style={styles.optionItem}>
		            {!room.votingOpen && <span>{opt.text}</span>}
		            {room.votingOpen && !hasVoted && (
		              <label style={styles.voteLabel}>
		                <input
		                  type="radio"
		                  name="optionVote"
		                  value={opt._id}
		                  onChange={() => setSelectedOptionId(opt._id)}
		                  disabled={voteCasting}
		                />{' '}
		                {opt.text}
		              </label>
		            )}
		            {room.votingOpen && hasVoted && (
		              <span>{opt.text} {selectedOptionId === opt._id && <strong>(Your vote)</strong>}</span>
		            )}
		          </li>
		        ))}
		      </ul>

		      {room.votingOpen && !hasVoted && (
		        <button onClick={vote} disabled={voteCasting || !selectedOptionId} style={styles.button}>
		          {voteCasting ? 'Casting vote...' : 'Vote'}
		        </button>
		      )}

		      {isCreator && !room.votingOpen && options.length > 0 && (
		        <button onClick={openVoting} style={styles.buttonGreen}>
		          Open Voting
		        </button>
		      )}

		      {isCreator && room.votingOpen && (
		        <button onClick={closeVoting} disabled={votingClosing} style={styles.buttonRed}>
		          {votingClosing ? 'Closing...' : 'Close Voting'}
		        </button>
		      )}

		      {finalOptionText && (
		        <div style={{ marginTop: 20, padding: 20, backgroundColor: '#222', color: 'white', fontSize: 24, borderRadius: 6, textAlign: 'center' }}>
		          <span role="img" aria-label="celebration">🎉</span> Final Decision: <strong>{finalOptionText}</strong>
		        </div>
		      )}

		      {isCreator && tiedOptionIds.length > 0 && !finalOptionText && (
		        <div style={{ marginTop: 20 }}>
		          <h3>Tiebreaker needed!</h3>
		          <p>Choose a method to resolve the tie:</p>
		          <div style={{ display: 'flex', gap: 10 }}>
		            <button disabled={tiebreaking} onClick={() => triggerTiebreaker('dice')} style={styles.button}>
		              <span role="img" aria-label="dice">🎲</span> Dice Roll
		            </button>
		            <button disabled={tiebreaking} onClick={() => triggerTiebreaker('spinner')} style={styles.button}>
		              <span role="img" aria-label="spinner">🎡</span> Spinner
		            </button>
		            <button disabled={tiebreaking} onClick={() => triggerTiebreaker('coin')} style={styles.button}>
		              <span role="img" aria-label="coin flip">🪙</span> Coin Flip
		            </button>
		          </div>
		          {tiebreaking && <p>Running {tiebreakerMethod} animation...</p>}
		        </div>
		      )}
		    </div>
		  );
		}
		// Past Decisions page
		function PastDecisions() {
		  const [rooms, setRooms] = React.useState([]);
		  const [loading, setLoading] = React.useState(true);

		  React.useEffect(() => {
		    async function fetchPast() {
		      try {
		        const { data } = await api.get('/rooms/past/rooms');
		        setRooms(data);
		      } catch {
		        toast.error('Failed to load past decisions');
		      } finally {
		        setLoading(false);
		      }
		    }
		    fetchPast();
		  }, []);

		  if (loading) return <div style={styles.centered}>Loading past decisions...</div>;

		  if (rooms.length === 0) return <div style={styles.centered}>No past decisions found.</div>;

		  return (
		    <div style={{ ...styles.container, maxWidth: 600 }}>
		      <h2>Past Decisions</h2>
		      <Link to="/" style={{ marginBottom: 20, display: 'inline-block' }}>
		        ← Back to Home
		      </Link>
		      <ul>
		        {rooms.map(room => (
		          <li key={room.id} style={{ marginBottom: 15, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}>
		            <strong>{room.title}</strong> <br />
		            Final choice: <em>{room.finalChosenOption}</em> <br />
		            Closed: {new Date(room.votingClosedAt).toLocaleString()} <br />
		            {room.tiebreakerUsed && <span>Tiebreaker: {room.tiebreakerUsed}</span>}
		          </li>
		        ))}
		      </ul>
		    </div>
		  );
		}

		export default function App() {
		  return (
		    <AuthProvider>
		      <Router>
		        <ToastContainer position="top-right" autoClose={3000} />
		        <Routes>
		          <Route path="/login" element={<Login />} />
		          <Route path="/signup" element={<Signup />} />
		          <Route path="/room/:roomCode" element={<PrivateRoute><Room /></PrivateRoute>} />
		          <Route path="/past-decisions" element={<PrivateRoute><PastDecisions /></PrivateRoute>} />
		          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
		          <Route path="*" element={<Navigate to="/" replace />} />
		        </Routes>
		      </Router>
		    </AuthProvider>
		  );
		}

		const styles = {
		  container: {
		    maxWidth: 480,
		    margin: '30px auto',
		    padding: 20,
		    boxShadow: '0px 0px 10px rgba(0,0,0,0.1)',
		    borderRadius: 8,
		    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
		  },
		  centered: {
		    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
		    maxWidth: 400,
		    margin: '30px auto',
		    textAlign: 'center'
		  },
		  form: {
		    display: 'flex',
		    flexDirection: 'column',
		    gap: 15
		  },
		  input: {
		    padding: 10,
		    fontSize: 16,
		    borderRadius: 4,
		    border: '1px solid #ccc'
		  },
		  inputShort: {
		    padding: '6px 8px',
		    fontSize: 16,
		    width: 'calc(100% - 100px)',
		    borderRadius: 4,
		    border: '1px solid #ccc',
		    marginRight: 10
		  },
		  button: {
		    cursor: 'pointer',
		    padding: '10px 20px',
		    fontSize: 16,
		    borderRadius: 5,
		    backgroundColor: '#007bff',
		    color: 'white',
		    border: 'none',
		    transition: 'background-color 0.3s'
		  },
		  buttonRed: {
		    cursor: 'pointer',
		    padding: '8px 16px',
		    fontSize: 14,
		    borderRadius: 5,
		    backgroundColor: '#dc3545',
		    color: 'white',
		    border: 'none',
		    marginTop: 5
		  },
		  buttonGreen: {
		    cursor: 'pointer',
		    padding: '10px 20px',
		    fontSize: 16,
		    borderRadius: 5,
		    backgroundColor: '#28a745',
		    color: 'white',
		    border: 'none',
		    marginTop: 10,
		    width: '100%'
		  },
		  optionList: {
		    listStyleType: 'none',
		    paddingLeft: 0
		  },
		  optionItem: {
		    marginBottom: 10,
		    fontSize: 18
		  },
		  voteLabel: {
		    cursor: 'pointer',
		    userSelect: 'none'
		  },
		  shareInput: {
		    padding: 8,
		    width: '100%',
		    fontSize: 14,
		    borderRadius: 4,
		    border: '1px solid #ccc'
		  }
		};

