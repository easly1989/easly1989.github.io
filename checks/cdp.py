"""A small DevTools driver: a throwaway Chrome, with its own profile, on a random port.
Set CHROME to the browser's path if it is not where Windows installs it."""
import base64
import json
import os
import pathlib
import subprocess
import tempfile
import time
import urllib.request

import websocket

CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")


class Browser:
    def __init__(self, width=1300, height=900, headless=True):
        self.profile = tempfile.mkdtemp(prefix="cdp-")
        args = [CHROME, "--remote-debugging-port=0", f"--user-data-dir={self.profile}",
                "--no-first-run", "--no-default-browser-check", f"--window-size={width},{height}",
                # keep painting when the window opens behind another one
                "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
                "--disable-background-timer-throttling"]
        if headless:
            args.append("--headless=new")
        self.proc = subprocess.Popen(args + ["about:blank"])
        port_file = pathlib.Path(self.profile) / "DevToolsActivePort"
        for _ in range(100):
            try:
                if port_file.exists() and port_file.read_text().strip():
                    break
            except PermissionError:  # Chrome is still writing it
                pass
            time.sleep(0.1)
        port = port_file.read_text().split()[0]
        targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
        page = next(t for t in targets if t["type"] == "page")
        self.ws = websocket.create_connection(page["webSocketDebuggerUrl"], suppress_origin=True)
        self.n = 0
        self.call("Page.enable")
        self.call("Runtime.enable")

    def call(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == self.n:
                if "error" in m:
                    raise RuntimeError(m["error"])
                return m.get("result", {})

    def media(self, **features):
        self.call("Emulation.setEmulatedMedia",
                  features=[{"name": k.replace("_", "-"), "value": v} for k, v in features.items()])

    def size(self, w, h, mobile=False):
        self.call("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=1, mobile=mobile)

    def nav(self, url, wait=1.5):
        self.call("Page.navigate", url=url)
        time.sleep(wait)

    def js(self, expr):
        r = self.call("Runtime.evaluate", expression=expr, awaitPromise=True, returnByValue=True)
        if "exceptionDetails" in r:
            raise RuntimeError(r["exceptionDetails"])
        return r["result"].get("value")

    def shot(self, path):
        data = self.call("Page.captureScreenshot", format="png")["data"]
        pathlib.Path(path).write_bytes(base64.b64decode(data))

    def close(self):
        try:
            self.ws.close()
        finally:
            if os.name == "nt":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(self.proc.pid)], capture_output=True)
            else:
                self.proc.kill()
