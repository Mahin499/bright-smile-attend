# Facial Attendance Tool

This folder contains the standalone Python webcam attendance model.

## Setup
```bash
python -m pip install -r tools/facial_attendance/requirements.txt
```

## Run
```bash
python facerecognition.py --known-faces-dir known_faces --output attendance.csv
```

Or run the module directly:
```bash
python tools/facial_attendance/facerecognition.py --known-faces-dir known_faces --output attendance.csv
```
