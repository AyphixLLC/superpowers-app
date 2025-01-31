import * as fs from "fs";
import * as electron from "electron";
import * as settings from "../settings";
import * as i18n from "../../shared/i18n";

import * as systems from "./systems";
import "./log";

export let config: ServerConfig;

const settingsElt = document.querySelector(".server-settings") as HTMLDivElement;
const disabledElt = settingsElt.querySelector(".disabled") as HTMLDivElement;

const serverNameElt = settingsElt.querySelector(".server-name input") as HTMLInputElement;
const mainPortElt = settingsElt.querySelector(".main-port input") as HTMLInputElement;
const buildPortElt = settingsElt.querySelector(".build-port input") as HTMLInputElement;
const autoStartServerElt = settingsElt.querySelector("#auto-start-server-checkbox") as HTMLInputElement;

const openProjectsFolderElt = settingsElt.querySelector(".projects-folder button") as HTMLButtonElement;
const maxRecentBuildsElt = settingsElt.querySelector(".max-recent-builds input") as HTMLInputElement;

const openToInternetElt = document.getElementById("open-server-to-internet-checkbox") as HTMLInputElement;
const passwordRowElt = settingsElt.querySelector("li.password") as HTMLLIElement;
const passwordElt = passwordRowElt.querySelector("input") as HTMLInputElement;
const showOrHidePasswordElt = passwordRowElt.querySelector("button") as HTMLButtonElement;

export function start() {
  config = getServerConfig();

  if (config == null) {
    (settingsElt.querySelector(".error") as HTMLElement).hidden = false;
    (settingsElt.querySelector(".settings") as HTMLElement).hidden = true;
    (settingsElt.querySelector(".systems") as HTMLElement).hidden = true;
    return;
  }

  serverNameElt.value = config.serverName != null ? config.serverName : "";
  serverNameElt.addEventListener("input", scheduleSave);
  mainPortElt.value = config.mainPort.toString();
  mainPortElt.addEventListener("input", scheduleSave);
  buildPortElt.value = config.buildPort.toString();
  buildPortElt.addEventListener("input", scheduleSave);
  maxRecentBuildsElt.value = config.maxRecentBuilds.toString();
  maxRecentBuildsElt.addEventListener("input", scheduleSave);

  autoStartServerElt.checked = settings.autoStartServer;
  autoStartServerElt.addEventListener("change", onChangeAutoStartServer);

  openProjectsFolderElt.addEventListener("click", onOpenProjectsFolderClick);

  openToInternetElt.checked = config.password.length > 0;
  openToInternetElt.addEventListener("change", onChangeOpenToInternet);
  passwordRowElt.hidden = config.password.length === 0;
  passwordElt.value = config.password;
  passwordElt.addEventListener("input", scheduleSave);
  showOrHidePasswordElt.addEventListener("click", onShowOrHidePassword);

  systems.refreshRegistry();
}

export function enable(enabled: boolean) {
  disabledElt.hidden = enabled;
}

interface ServerConfig {
  serverName: string;
  mainPort: number;
  buildPort: number;
  password: string;
  maxRecentBuilds: number;
  [key: string]: any;
}

function getServerConfig() {
  let defaultConfig: ServerConfig;
  try {
    /* tslint:disable */
    defaultConfig = require(`${settings.corePath}/server/config.js`).defaults;
    /* tslint:enable */
  } catch (err) {
    return null;
  }

  let localConfig: ServerConfig;
  try {
    localConfig = JSON.parse(fs.readFileSync(`${settings.userDataPath}/config.json`, { encoding: "utf8" }));
  } catch (err) { /* Ignore */ }
  if (localConfig == null) localConfig = {} as any;

  const config: ServerConfig = {} as any;
  for (const key in defaultConfig) {
    if (localConfig[key] != null) config[key] = localConfig[key];
    else config[key] = defaultConfig[key];
  }

  return config;
}

function onOpenProjectsFolderClick() {
  electron.shell.openExternal(`${settings.userDataPath}/projects/`);
}

function onChangeAutoStartServer() {
  settings.setAutoStartServer(autoStartServerElt.checked);
  settings.scheduleSave();
}

function onChangeOpenToInternet() {
  if (openToInternetElt.checked) {
    let password = "";
    for (let i = 0; i < 15; i++) {
      const minCharCode = 33;
      const maxCharCode = 126;
      const charCode = minCharCode + Math.round(Math.random() * (maxCharCode - minCharCode));
      const char = String.fromCharCode(charCode);
      password += char;
    }

    passwordElt.value = password;
    passwordRowElt.hidden = false;
  } else {
    passwordRowElt.hidden = true;
    passwordElt.value = "";
  }

  scheduleSave();
}

function onShowOrHidePassword() {
  if (passwordElt.type === "password") {
    passwordElt.type = "text";
    showOrHidePasswordElt.textContent = i18n.t("common:actions.hide");
  } else {
    passwordElt.type = "password";
    showOrHidePasswordElt.textContent = i18n.t("common:actions.show");
  }
}

let scheduleSaveTimeoutId: NodeJS.Timeout;

export function scheduleSave() {
  if (scheduleSaveTimeoutId != null) return;
  scheduleSaveTimeoutId = setTimeout(applyScheduledSave, 30 * 1000);
}

export function applyScheduledSave() {
  if (scheduleSaveTimeoutId == null) return;

  config.serverName = serverNameElt.value.length > 0 ? serverNameElt.value : null;
  config.mainPort = parseInt(mainPortElt.value, 10);
  config.buildPort = parseInt(buildPortElt.value, 10);
  config.password = passwordElt.value;
  config.maxRecentBuilds = parseInt(maxRecentBuildsElt.value, 10);

  fs.writeFileSync(`${settings.userDataPath}/config.json`, JSON.stringify(config, null, 2) + "\n", { encoding: "utf8" });

  clearTimeout(scheduleSaveTimeoutId);
  scheduleSaveTimeoutId = null;
}
