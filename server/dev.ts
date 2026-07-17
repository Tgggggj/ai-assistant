import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const children: ReturnType<typeof spawn>[] = [];

function run(name: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    env: {
      ...process.env,
    },
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });

  children.push(child);
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('api', 'tsx', ['server/index.ts']);
run('web', 'vite', ['--port=3000', '--host=0.0.0.0']);
