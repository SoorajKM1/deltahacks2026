import time
import os
import sys
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BASE_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

MEMORIES_DIR = os.path.join(BASE_DATA_DIR, "memories")
IMAGES_DIR   = os.path.join(BASE_DATA_DIR, "images")

INGEST_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), "ingest", "ingest_memories.py"))

class SmartHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        self.process_change(event.src_path, "✨ Created")

    def on_modified(self, event):
        if event.is_directory:
            return
        self.process_change(event.src_path, "⚡ Modified")

    def process_change(self, file_path, action_type):
        filename = os.path.basename(file_path)

        if file_path.endswith(".txt"):
            print(f"\n{action_type} Text: {filename}")
            print("   🔄 Syncing Brain...")
            try:
                subprocess.run([sys.executable, INGEST_SCRIPT], check=True)
            except subprocess.CalledProcessError:
                print("   ❌ Error during sync. Check ingest_memories.py output above.")
            else:
                print("   ✅ Sync Complete.")

        elif file_path.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            print(f"\n{action_type} Image: {filename}")
            print("   📸 New photo added to vault.")
            print("   ℹ️ If you updated labels.json, remember to POST /rebuild on the vision server.")

if __name__ == "__main__":
    if not os.path.exists(MEMORIES_DIR):
        print(f"⚠️ Creating missing folder: {MEMORIES_DIR}")
        os.makedirs(MEMORIES_DIR)

    if not os.path.exists(IMAGES_DIR):
        print(f"⚠️ Creating missing folder: {IMAGES_DIR}")
        os.makedirs(IMAGES_DIR)

    print("👀 WATCHER STARTED")
    print(f"   📂 Monitoring Memories: {MEMORIES_DIR}")
    print(f"   📂 Monitoring Images:   {IMAGES_DIR}")
    print("---------------------------------------------------")

    event_handler = SmartHandler()
    observer = Observer()

    observer.schedule(event_handler, path=MEMORIES_DIR, recursive=False)
    observer.schedule(event_handler, path=IMAGES_DIR, recursive=False)

    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
