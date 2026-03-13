import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function start(cmd, args, cwd, extraEnv = {}) {
  const p = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: false,
  })
  return p
}

function run(cmd, args, cwd, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
      shell: false,
    })
    p.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))
    })
  })
}

function startNpmDev(cwd) {
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || 'cmd.exe'
    return spawn(comspec, ['/d', '/s', '/c', 'npm run dev -- --host 127.0.0.1 --port 5173'], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || 'http://127.0.0.1:8000' },
      shell: false,
    })
  }

  return spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || 'http://127.0.0.1:8000' },
    shell: false,
  })
}

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendCwd = path.resolve(here, '..')
const backendCwd = path.resolve(here, '..', '..', 'backend')

const e2eDbPath = path.resolve(backendCwd, 'e2e.db')
try {
  if (fs.existsSync(e2eDbPath)) fs.unlinkSync(e2eDbPath)
} catch {}

const backendEnv = {
  E2E_STUB_MODE: '1',
  SECRET_KEY: process.env.SECRET_KEY || 'test-secret',
  DATABASE_URL: `sqlite:///${e2eDbPath}`,
  FRONTEND_URL: 'http://127.0.0.1:5173',
}

await run('python', ['-m', 'alembic', 'upgrade', 'head'], backendCwd, backendEnv)

const backend = start('python', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], backendCwd, backendEnv)

const frontend = startNpmDev(frontendCwd)

function shutdown(code) {
  try {
    backend.kill()
  } catch {}
  try {
    frontend.kill()
  } catch {}
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

backend.on('exit', (code) => shutdown(code || 1))
frontend.on('exit', (code) => shutdown(code || 1))
