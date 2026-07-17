import test from "node:test";
import assert from "node:assert/strict";

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
