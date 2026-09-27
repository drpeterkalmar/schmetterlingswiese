# Lokaler Test-Server: mehrfädig + große Warteschlange (Standard-http.server wirft bei vielen parallelen
# Modul-Anfragen ERR_CONNECTION_RESET). Start: python3 tools/serve.py
import http.server, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

class S(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True

S(('', 8471), Quiet).serve_forever()
