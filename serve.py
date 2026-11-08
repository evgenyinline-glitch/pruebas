# -*- coding: utf-8 -*-
"""Локальный сервер сайта с поддержкой HTTP Range.

Запуск:  python serve.py   (затем открыть http://127.0.0.1:8000/)

Зачем: обычный `python -m http.server` не умеет отдавать файлы частями
(Range-запросы), из-за чего браузер считает видео несикользым
(video.seekable = [0,0]) и scroll-driven видео в hero не проигрывается.
Любой боевой хостинг (nginx, Apache, S3, CDN) Range поддерживает.
"""
import functools
import http.server
import os
import re
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # браузер должен знать, что файл можно запрашивать кусками
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_GET(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        if rng and os.path.isfile(path) and os.path.getsize(path) > 0:
            self._serve_range(path, rng)
        else:
            super().do_GET()

    def _serve_range(self, path, header):
        m = re.match(r"bytes=(\d*)-(\d*)", header.strip())
        if not m:
            self.send_error(416, "Bad Range")
            return

        size = os.path.getsize(path)
        raw_start, raw_end = m.group(1), m.group(2)
        if raw_start == "":  # suffix-запрос: bytes=-500
            start, end = max(0, size - int(raw_end or 0)), size - 1
        else:
            start = int(raw_start)
            end = int(raw_end) if raw_end else size - 1
        end = min(end, size - 1)

        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.end_headers()
            return

        length = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(length))
        self.end_headers()

        try:
            with open(path, "rb") as fh:
                fh.seek(start)
                left = length
                while left > 0:
                    chunk = fh.read(min(65536, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


socketserver.ThreadingTCPServer.allow_reuse_address = True
handler = functools.partial(Handler, directory=ROOT)

if __name__ == "__main__":
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler) as httpd:
        print("Созидание -> http://127.0.0.1:%d/  (Range поддерживается)" % PORT)
        print("Ctrl+C — остановить")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nостановлено")
