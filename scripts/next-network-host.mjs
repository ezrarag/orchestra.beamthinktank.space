import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import path from 'node:path';

const [, , command = 'dev', ...inputArgs] = process.argv;

function readArgValue(args, shortFlag, longFlag) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === shortFlag || value === longFlag) {
      return args[index + 1];
    }

    if (value.startsWith(`${longFlag}=`)) {
      return value.slice(longFlag.length + 1);
    }
  }

  return undefined;
}

function hasHostnameArg(args) {
  return args.some((value, index) => {
    if (value === '-H' || value === '--hostname') {
      return Boolean(args[index + 1]);
    }

    return value.startsWith('--hostname=');
  });
}

function getNetworkIp() {
  const interfaces = networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

const bindHostname = readArgValue(inputArgs, '-H', '--hostname') ?? '0.0.0.0';
const networkIp = getNetworkIp();
const displayHostname = bindHostname === '0.0.0.0' && networkIp ? networkIp : bindHostname;

const nextArgs = hasHostnameArg(inputArgs)
  ? [command, ...inputArgs]
  : [command, '--hostname', '0.0.0.0', ...inputArgs];
const nextBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');

function writeOutput(stream, chunk) {
  const text = chunk.toString();

  if (!networkIp || bindHostname !== '0.0.0.0') {
    stream.write(text);
    return;
  }

  stream.write(text.replaceAll('0.0.0.0', displayHostname));
}

const child = spawn(nextBin, nextArgs, {
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

child.stdout.on('data', (chunk) => writeOutput(process.stdout, chunk));
child.stderr.on('data', (chunk) => writeOutput(process.stderr, chunk));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
