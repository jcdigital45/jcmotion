import { Config } from '@remotion/cli/config';
import fs from 'fs';
import os from 'os';

// Navigateur : REMOTION_CHROME s'il est défini, sinon Chrome système sur Linux, sinon Remotion télécharge le sien.
const candidates = [process.env.REMOTION_CHROME, '/usr/bin/google-chrome'].filter(Boolean) as string[];
const chrome = candidates.find((p) => fs.existsSync(p));
if (chrome) Config.setBrowserExecutable(chrome);
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2))));
