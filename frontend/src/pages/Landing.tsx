import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function Landing() {
  const { auth, authBusy, authError, register, login, state } = useGame();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (auth) {
      navigate('/lobby');
    }
  }, [auth, navigate]);

  async function submitAuthForm() {
    if (isRegisterMode) {
      await register({ username, displayName, password });
    } else {
      await login({ username, password });
    }
    setPassword('');
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4 sm:p-6">
      <section className="panel mx-auto mt-8 max-w-3xl animate-floatIn">
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="inline-block border-4 border-black bg-yellow-300 px-2 py-1 text-xs font-black uppercase tracking-widest text-black shadow-[2px_2px_0_0_#000]">
              Realtime Ludo Arena
            </p>
            <h1 className="mt-4 font-display text-4xl font-black uppercase leading-tight text-black sm:text-5xl">
              Enter the board.
              <br />
              Claim the crown.
            </h1>
            <p className="mt-3 text-sm font-bold text-black/70">
              Multi-page play flow: authenticate, build your room, then jump into a fully interactive arena with live turns, chat, and timeline.
            </p>
            <div className="mt-3 border-4 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]">
              Server status: <strong>{state.isConnected ? 'Connected' : 'Disconnected'}</strong>
            </div>
          </div>

          <form
            className="grid gap-3 border-4 border-black bg-pink-300 p-4 shadow-[8px_8px_0_0_#000]"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAuthForm();
            }}
          >
            <h2 className="font-display text-2xl font-black uppercase text-black">
              {isRegisterMode ? 'Create Account' : 'Welcome Back'}
            </h2>

            <label className="grid gap-1 text-sm font-black uppercase text-black">
              Username
              <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>

            {isRegisterMode ? (
              <label className="grid gap-1 text-sm font-black uppercase text-black">
                Display Name
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
            ) : null}

            <label className="grid gap-1 text-sm font-black uppercase text-black">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {authError ? (
              <p className="rounded-none border-4 border-black bg-rose-400 px-3 py-2 text-sm font-bold text-black shadow-[4px_4px_0_0_#000]">
                {authError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button disabled={authBusy} type="submit">
                {authBusy ? 'Please wait…' : isRegisterMode ? 'Register and Continue' : 'Login'}
              </Button>
              <Button
                variant="secondary"
                disabled={authBusy}
                type="button"
                onClick={() => setIsRegisterMode((prev) => !prev)}
              >
                {isRegisterMode ? 'I already have an account' : 'Create a new account'}
              </Button>
            </div>

            <p className="text-xs font-bold text-black/70">
              After login, continue to the <Link className="underline" to="/lobby">lobby</Link> to create or join a room.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
