#!/usr/bin/env python3
"""
obs_hourly_snapshot.py

Takes a YYYY-MM-DD_HH-MM-SS.jpg screenshot every hour
but only while OBS is live AND you’ve got the right scene selected.
"""

import os
import time
import datetime
import threading

from obswebsocket import obsws, requests, events
import schedule

# ─── CONFIG ────────────────────────────────────────────────────────────────
HOST = "localhost"
PORT = 4455
PASSWORD = "bv1ImAc0UErzAMJP"
SOURCE = "Kamera"  # EXACT name of the source in OBS
SAVE_DIR = r"C:\Users\Framt\Pictures\Flomstream"
TARGET_SCENE = "Flomstream"  # EXACT name of the scene
INTERVAL_MIN = 1  # minutes between snapshots
# ──────────────────────────────────────────────────────────────────────────


class Snapshotter:
    def __init__(self):
        self.ws = obsws(HOST, PORT, PASSWORD)
        self.streaming = False
        self.current_scene = None
        self.lock = threading.Lock()

    def start(self):
        # connect & subscribe to events
        self.ws.connect()
        self.ws.register(self.on_stream_started, events.StreamStarted)
        self.ws.register(self.on_stream_stopped, events.StreamStopped)
        self.ws.register(self.on_switch_scenes, events.SwitchScenes)
        # kick off the schedule loop in another thread
        threading.Thread(target=self._run_scheduler, daemon=True).start()
        print("▶ Snapshotter running. Ctrl+C to exit.\n")
        # keep the main thread alive to receive events
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n✋ Shutting down...")
            self.ws.disconnect()

    def on_stream_started(self, event):
        with self.lock:
            self.streaming = True
        print("▶ Stream started")

    def on_stream_stopped(self, event):
        with self.lock:
            self.streaming = False
        print("▶ Stream stopped")

    def on_switch_scenes(self, event):
        with self.lock:
            self.current_scene = event.getSceneName()
        print("▶ Switched to scene:", self.current_scene)

    def _run_scheduler(self):
        # every INTERVAL_MIN minutes
        schedule.every(INTERVAL_MIN).minutes.do(self.attempt_snapshot)
        # loop
        while True:
            schedule.run_pending()
            time.sleep(1)

    def attempt_snapshot(self):
        with self.lock:
            live = self.streaming
            scene_ok = self.current_scene == TARGET_SCENE

        if not live:
            print(f"[{now()}] ❌ Not live—skipping snapshot.")
            return
        if not scene_ok:
            print(
                f"[{now()}] ❌ Scene is “{self.current_scene}”—waiting for “{TARGET_SCENE}”."
            )
            return

        # all good → take one
        self.take_snapshot()

    def take_snapshot(self):
        # ensure folder exists
        os.makedirs(SAVE_DIR, exist_ok=True)
        ts = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        path = os.path.join(SAVE_DIR, f"{ts}.jpg")

        # ask OBS to save it
        try:
            self.ws.call(
                requests.TakeSourceScreenshot(
                    sourceName=SOURCE, embedPictureFormat="jpg", saveToFilePath=path
                )
            )
            print(f"[{now()}] ✅ Saved snapshot: {path}")
        except Exception as e:
            print(f"[{now()}] ⚠️  Error taking snapshot:", e)


def now():
    return datetime.datetime.now().strftime("%H:%M:%S")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--test",
        "-t",
        action="store_true",
        help="Connect, take one snapshot immediately, then exit.",
    )
    args = parser.parse_args()

    s = Snapshotter()

    if args.test:
        # --- TEST MODE: just take one screenshot and quit ---
        s.ws.connect()
        print("▶ Running test snapshot…")
        s.take_snapshot()
        s.ws.disconnect()
        print("✅ Test snapshot complete. Check your folder.")
    else:
        # --- NORMAL MODE: watch for StreamStarted / scene changes ---
        s.start()
