import { bindLog, clearLog, log, run } from "./logger";
import { initTabs } from "./tabs";
import { bootstrapAdvanced } from "./advanced/main";
import { bootstrapSimple } from "./simple/main";
import * as directory from "./advanced/opfs/directory";

const logList = document.getElementById("log") as HTMLOListElement | null;
if (logList) bindLog(logList);

document.getElementById("clear-log")?.addEventListener("click", clearLog);

document.getElementById("clear-opfs")?.addEventListener("click", () => {
  void run("wipe OPFS root", directory.wipeRoot);
});

document.getElementById("refresh-list")?.addEventListener("click", () => {
  void run("list root", directory.listRootShort);
});

initTabs("simple");
bootstrapSimple();
bootstrapAdvanced();

if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) {
  log("err", "OPFS API is not available in this browser context");
} else {
  log("info", "Ready. Open the OPFS Studio extension to inspect changes.");
}
