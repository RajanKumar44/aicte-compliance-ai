"""Antivirus and malware scanning integration for AICTE Compliance Assistant.

Provides explicit scan statuses ('clean', 'infected', 'scan_unavailable') and
enforces download blocking on infected or unverified files.
"""
from __future__ import annotations

import os
import socket
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

ScanStatus = Literal["pending", "clean", "infected", "scan_unavailable"]

EICAR_SIGNATURE = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


@dataclass(frozen=True)
class ScanResult:
    status: ScanStatus
    scanner_name: str
    details: str
    scanned_at: str

    def to_dict(self) -> dict[str, str]:
        return {
            "status": self.status,
            "scanner_name": self.scanner_name,
            "details": self.details,
            "scanned_at": self.scanned_at,
        }


def scan_file_bytes(content: bytes) -> ScanResult:
    """Scan file bytes for malware using ClamAV if configured, with EICAR detection.

    Never claims an unscanned file is clean. If ClamAV daemon is unreachable
    or unconfigured, truthfully reports scan_status='scan_unavailable'.
    """
    now = datetime.now(UTC).isoformat()

    # 1. Immediate signature check for EICAR test virus
    if EICAR_SIGNATURE in content:
        return ScanResult(
            status="infected",
            scanner_name="SignatureScanner/EicarDetector",
            details="Known malware signature detected: Eicar-Test-Signature. File quarantined.",
            scanned_at=now,
        )

    # 2. ClamAV TCP daemon check if configured
    clamav_host = os.environ.get("CLAMAV_HOST")
    clamav_port = int(os.environ.get("CLAMAV_PORT", "3310"))
    clamav_socket_path = os.environ.get("CLAMAV_SOCKET", "/var/run/clamav/clamd.ctl")

    sock = None
    try:
        if clamav_host:
            sock = socket.create_connection((clamav_host, clamav_port), timeout=2.0)
        elif os.path.exists(clamav_socket_path):
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.connect(clamav_socket_path)
            sock.settimeout(2.0)
    except OSError:
        sock = None

    if sock is not None:
        try:
            with sock:
                # INSTREAM command
                sock.sendall(b"zINSTREAM\0")
                chunk_size = 2048
                for offset in range(0, len(content), chunk_size):
                    chunk = content[offset : offset + chunk_size]
                    sock.sendall(len(chunk).to_bytes(4, byteorder="big") + chunk)
                sock.sendall((0).to_bytes(4, byteorder="big"))

                response = sock.recv(1024).decode("utf-8", errors="replace").strip()
                if "OK" in response:
                    return ScanResult(
                        status="clean",
                        scanner_name="ClamAV Daemon",
                        details="ClamAV scanned: No virus or malicious payload found.",
                        scanned_at=now,
                    )
                if "FOUND" in response:
                    virus_name = response.split("FOUND")[0].replace("stream:", "").strip()
                    return ScanResult(
                        status="infected",
                        scanner_name="ClamAV Daemon",
                        details=f"Infected file detected: {virus_name}. File rejected.",
                        scanned_at=now,
                    )
        except OSError as exc:
            return ScanResult(
                status="scan_unavailable",
                scanner_name="ClamAV",
                details=f"ClamAV scan stream communication interrupted: {exc}",
                scanned_at=now,
            )

    # If ClamAV daemon is not configured or reachable:
    return ScanResult(
        status="scan_unavailable",
        scanner_name="ClamAV (Not Connected)",
        details=(
            "No malware scanning daemon (ClamAV) is connected in this deployment environment. "
            "File cannot be verified clean."
        ),
        scanned_at=now,
    )


def is_download_permitted(scan_status: str) -> tuple[bool, str]:
    """Determine whether file download is permitted based on security policy.

    Infected files are NEVER permitted.
    Unscanned files default to blocked unless ALLOW_UNSCANNED_DOWNLOADS=true.
    """
    if scan_status == "infected":
        return False, "Download blocked: File was flagged as infected with malware."

    if scan_status == "clean":
        return True, "Permitted: File passed antivirus verification."

    # scan_status == "scan_unavailable" or "pending"
    allow_unscanned = os.environ.get("ALLOW_UNSCANNED_DOWNLOADS", "false").lower() in ("true", "1")
    if allow_unscanned:
        return (
            True,
            "Permitted under prototype policy: Antivirus scanner was unavailable. Download with caution.",
        )

    return (
        False,
        ("Download blocked: File could not be verified by an active antivirus scanner. "
        "Production security policy blocks unverified downloads."),
    )
