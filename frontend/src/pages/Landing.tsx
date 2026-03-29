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
    <main className="mx-auto flex min-h-screen max-w-6xl items-center p-4 sm:p-8">
      <section className="panel mx-auto w-full max-w-4xl animate-floatIn">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
              Ludo Online
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Login, join a room,
              <br />
              and start playing.
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Clean flow: 1) login or register, 2) create/join room, 3) open game page with only the Ludo board.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
                <p className="mt-1 text-sm font-medium text-slate-800">Authenticate</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
                <p className="mt-1 text-sm font-medium text-slate-800">Room Setup</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
                <p className="mt-1 text-sm font-medium text-slate-800">Play Board</p>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              Realtime: <span className="ml-1 font-semibold text-slate-900">{state.isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>

          <form
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAuthForm();
            }}
          >
            <h2 className="text-2xl font-semibold text-slate-900">
              {isRegisterMode ? 'Create Account' : 'Welcome Back'}
            </h2>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Username
              <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>

            {isRegisterMode ? (
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Display Name
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
            ) : null}

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {authError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
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

            <p className="text-xs text-slate-500">
              After login, continue to the <Link className="underline" to="/lobby">lobby</Link> to create or join a room.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
