import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("MAU cutaway activates only its dedicated mode button", async () => {
  const uiModule = await import("../src/app/create-ui.js");
  assert.equal(typeof uiModule.isControlActive, "function");

  const state = {
    mode: "mau",
    xrayEnabled: true,
    tourEnabled: false,
    pipesVisible: false,
    labelsVisible: false,
  };

  assert.equal(uiModule.isControlActive("mau", state), true);
  assert.equal(uiModule.isControlActive("xray", state), false);
});

test("process and hydronic legends render the physical sequence", async () => {
  const uiModule = await import("../src/app/create-ui.js");
  assert.equal(typeof uiModule.renderMauProcessMarkup, "function");
  assert.equal(typeof uiModule.renderHydronicLoopsMarkup, "function");

  const processMarkup = uiModule.renderMauProcessMarkup();
  assert.equal((processMarkup.match(/data-stage=/g) ?? []).length, 8);
  assert.ok(processMarkup.indexOf("进风") < processMarkup.indexOf("送风"));
  assert.match(processMarkup, /降温除湿/);

  const hydronicMarkup = uiModule.renderHydronicLoopsMarkup();
  assert.equal((hydronicMarkup.match(/data-loop=/g) ?? []).length, 2);
  assert.ok(hydronicMarkup.indexOf("CHWR") < hydronicMarkup.indexOf("冷冻水泵"));
  assert.ok(hydronicMarkup.indexOf("CWS") < hydronicMarkup.indexOf("冷却水泵"));

  const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(indexHtml, /id="mau-process-rail"/);
  assert.match(indexHtml, /id="hydronic-loop-legend"/);
});
