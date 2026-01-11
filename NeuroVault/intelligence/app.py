import threading
import time
from flask import Flask
import ingest_memories # Your existing script

app = Flask(__name__)

def background_ingestor():
    print("🚀 Render Ingestor Thread Started")
    while True:
        try:
            ingest_memories.ingest_pending()
            print("✅ Ingestion cycle complete.")
        except Exception as e:
            print(f"❌ Ingestion failed: {e}")
        # Wait 10 minutes (600 seconds)
        time.sleep(600)

# Start the worker thread
threading.Thread(target=background_ingestor, daemon=True).start()

@app.route('/')
def health_check():
    return {"status": "Ingestor is active"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)