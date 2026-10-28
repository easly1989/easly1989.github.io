"""Serves the site from the repo root for a check: fresh on every load, and with byte ranges, as
GitHub Pages serves it (the radio seeks into its tracks). Run on its own to browse:
python checks/serve.py [port]"""
import functools
import http.server
import os
import pathlib
import re
import sys
import threading

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # revalidated on every load or reload (going back may show the page as it was left, as
        # on GitHub Pages); no-store would also keep every page out of the back/forward cache,
        # which GitHub Pages (max-age=600) does not, and history.back() in a check would load
        # the page afresh instead of bringing it back
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def log_message(self, *args):
        pass

    def send_head(self):
        m = re.match(r"bytes=(\d*)-(\d*)$", self.headers.get("Range", ""))
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else max(0, size - int(m.group(2) or 0))
        end = min(int(m.group(2)) if m.group(1) and m.group(2) else size - 1, size - 1)
        if start >= size:
            self.send_error(416)
            return None
        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._left = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, "_left", None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            chunk = source.read(min(65536, left))
            if not chunk:
                break
            outputfile.write(chunk)
            left -= len(chunk)


def serve(port=0):
    """Starts the server in the background; returns its base URL."""
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{httpd.server_address[1]}"


if __name__ == "__main__":
    base = serve(int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
    print("serving", ROOT, "at", base)
    threading.Event().wait()
