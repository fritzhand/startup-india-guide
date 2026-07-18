import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Crisp text, small file — quality-tuned h264.
Config.setCodec('h264');
Config.setCrf(18);
