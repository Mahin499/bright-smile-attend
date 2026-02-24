#!/usr/bin/env python3
"""Live facial-recognition attendance marker.

Usage:
  python facerecognition.py --known-faces-dir known_faces --output attendance.csv

The known faces directory should contain one image per person with the filename
as the person's name (for example: `John_Doe.jpg`).
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import Any, List, Tuple


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Live facial recognition attendance")
    parser.add_argument(
        "--known-faces-dir",
        type=Path,
        default=Path("known_faces"),
        help="Directory containing known face images.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("attendance.csv"),
        help="CSV file to write attendance records.",
    )
    parser.add_argument(
        "--camera-index",
        type=int,
        default=0,
        help="OpenCV camera index.",
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=0.5,
        help="Face match tolerance (lower = stricter).",
    )
    return parser.parse_args()


def load_known_faces(known_faces_dir: Path) -> Tuple[List[str], List[Any]]:
    try:
        import face_recognition
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "Missing dependency 'face_recognition'. Install it with: pip install face_recognition"
        ) from exc

    if not known_faces_dir.exists() or not known_faces_dir.is_dir():
        raise FileNotFoundError(
            f"Known faces directory not found: {known_faces_dir.resolve()}"
        )

    names: List[str] = []
    encodings: List[Any] = []

    for image_path in sorted(known_faces_dir.iterdir()):
        if image_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        image = face_recognition.load_image_file(str(image_path))
        image_encodings = face_recognition.face_encodings(image)

        if not image_encodings:
            print(f"[warn] No face found in {image_path.name}, skipping.")
            continue

        names.append(image_path.stem.replace("_", " ").strip())
        encodings.append(image_encodings[0])

    if not encodings:
        raise RuntimeError(
            "No valid face encodings were loaded. Add clear face images in known_faces_dir."
        )

    print(f"Loaded {len(encodings)} known face(s).")
    return names, encodings


def ensure_csv_headers(csv_path: Path) -> None:
    if csv_path.exists():
        return

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["name", "date", "time"])


def mark_attendance(csv_path: Path, name: str) -> None:
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    existing_today = set()
    if csv_path.exists():
        with csv_path.open("r", newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                if row.get("date") == date_str:
                    existing_today.add(row.get("name", "").strip())

    if name in existing_today:
        return

    with csv_path.open("a", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow([name, date_str, time_str])
    print(f"[attendance] Marked {name} at {date_str} {time_str}")


def run_live_attendance(
    known_names: List[str],
    known_encodings: List[Any],
    output_csv: Path,
    camera_index: int,
    tolerance: float,
) -> None:
    try:
        import cv2
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "Missing dependency 'opencv-python'. Install it with: pip install opencv-python"
        ) from exc

    try:
        import face_recognition
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "Missing dependency 'face_recognition'. Install it with: pip install face_recognition"
        ) from exc

    video_capture = cv2.VideoCapture(camera_index)
    if not video_capture.isOpened():
        raise RuntimeError(
            f"Could not open camera index {camera_index}. Check camera permissions/device."
        )

    print("Starting camera feed... press 'q' to quit.")

    while True:
        ret, frame = video_capture.read()
        if not ret:
            print("[warn] Could not read frame from camera.")
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            matches = face_recognition.compare_faces(
                known_encodings, face_encoding, tolerance=tolerance
            )
            face_distances = face_recognition.face_distance(known_encodings, face_encoding)

            name = "Unknown"
            if len(face_distances) > 0:
                best_match_index = int(face_distances.argmin())
                if matches[best_match_index]:
                    name = known_names[best_match_index]
                    mark_attendance(output_csv, name)

            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.rectangle(frame, (left, bottom - 30), (right, bottom), (0, 255, 0), cv2.FILLED)
            cv2.putText(
                frame,
                name,
                (left + 6, bottom - 6),
                cv2.FONT_HERSHEY_DUPLEX,
                0.7,
                (0, 0, 0),
                1,
            )

        cv2.imshow("Live Attendance", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    video_capture.release()
    cv2.destroyAllWindows()


def main() -> None:
    args = parse_args()
    ensure_csv_headers(args.output)
    known_names, known_encodings = load_known_faces(args.known_faces_dir)
    run_live_attendance(
        known_names=known_names,
        known_encodings=known_encodings,
        output_csv=args.output,
        camera_index=args.camera_index,
        tolerance=args.tolerance,
    )


if __name__ == "__main__":
    main()
