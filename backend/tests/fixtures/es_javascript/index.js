import { helper } from './utils.js';

export const API_KEY = "12345";

export default async function startApp(config) {
  if (config.mode == "dev") {
    eval("console.log('dev')");
  }
  return helper(config);
}
