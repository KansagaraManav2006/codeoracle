import os
import shutil
import zipfile
from pathlib import Path
from typing import BinaryIO

from app.config import settings
from app.ingestion.discovery import IngestionError


def validate_zip_stream(input_stream: BinaryIO, temp_zip_path: Path) -> int:
    """
    Streams file upload into temporary zip file, checking chunk by chunk to enforce
    compressed size limit without loading full archive into memory.
    """
    total_compressed = 0
    chunk_size = 64 * 1024  # 64KB

    with open(temp_zip_path, "wb") as f_out:
        while True:
            chunk = input_stream.read(chunk_size)
            if not chunk:
                break
            total_compressed += len(chunk)

            if total_compressed > settings.MAX_ZIP_COMPRESSED_BYTES:
                raise IngestionError(
                    code="OVERSIZED_ZIP",
                    message=f"Uploaded ZIP compressed size exceeds maximum allowed limit of {settings.MAX_ZIP_COMPRESSED_BYTES // (1024 * 1024)}MB.",
                )
            f_out.write(chunk)

    if total_compressed == 0:
        raise IngestionError(code="EMPTY_FILE", message="Uploaded file is empty.")

    if not zipfile.is_zipfile(temp_zip_path):
        raise IngestionError(code="INVALID_ZIP", message="Uploaded file is not a valid ZIP archive.")

    return total_compressed


def extract_zip_safely(zip_file_path: Path, target_dir: Path) -> None:
    """
    Performs safe extraction of ZIP archive with multi-tier Zip Slip & Zip Bomb mitigations.
    """
    resolved_target = target_dir.resolve()
    resolved_target.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_file_path, "r") as zf:
        infolist = zf.infolist()

        # 1. Entry Count Limit
        if len(infolist) > settings.MAX_ZIP_ENTRIES:
            raise IngestionError(
                code="EXCESSIVE_ENTRIES",
                message=f"ZIP archive contains {len(infolist)} entries, exceeding maximum allowed limit of {settings.MAX_ZIP_ENTRIES}.",
            )

        total_uncompressed = 0

        for zinfo in infolist:
            # 2. Encrypted Archive Check
            if zinfo.flag_bits & 0x1:
                raise IngestionError(code="ENCRYPTED_ZIP", message="Encrypted ZIP archives are not supported.")

            # 3. Individual File Size Limit Check during extraction
            if not zinfo.is_dir() and zinfo.file_size > settings.MAX_FILE_BYTES:
                raise IngestionError(
                    code="FILE_TOO_LARGE",
                    message=f"ZIP entry '{zinfo.filename}' size ({zinfo.file_size} bytes) exceeds individual file limit of {settings.MAX_FILE_BYTES // (1024 * 1024)}MB.",
                )

            # 4. Unix Special File Entry Check (symlinks, FIFOs, sockets, character/block devices)
            mode = (zinfo.external_attr >> 16) & 0o170000
            if mode != 0 and mode not in (0o100000, 0o040000):  # 0o100000 = S_IFREG, 0o040000 = S_IFDIR
                if mode == 0o120000:  # S_IFLNK
                    raise IngestionError(
                        code="SYMLINK_NOT_ALLOWED",
                        message=f"ZIP contains symlink entry '{zinfo.filename}', which is not allowed.",
                    )
                else:
                    raise IngestionError(
                        code="UNSUPPORTED_ENTRY_TYPE",
                        message=f"ZIP entry '{zinfo.filename}' has unsupported special entry type.",
                    )

            # 5. Total Uncompressed Size & Compression Ratio Check
            total_uncompressed += zinfo.file_size
            if total_uncompressed > settings.MAX_ZIP_UNCOMPRESSED_BYTES:
                raise IngestionError(
                    code="EXCESSIVE_UNCOMPRESSED_SIZE",
                    message=f"Total uncompressed ZIP size exceeds limit of {settings.MAX_ZIP_UNCOMPRESSED_BYTES // (1024 * 1024)}MB.",
                )

            if zinfo.compress_size > 0:
                ratio = zinfo.file_size / zinfo.compress_size
                if ratio > settings.MAX_COMPRESSION_RATIO and zinfo.file_size > 1024 * 1024:
                    raise IngestionError(
                        code="EXCESSIVE_COMPRESSION_RATIO",
                        message=f"ZIP entry '{zinfo.filename}' has suspicious compression ratio ({ratio:.1f}x).",
                    )

            # 6. Zip Slip Path Traversal Safeguard
            fname = zinfo.filename

            if "\x00" in fname:
                raise IngestionError(code="PATH_TRAVERSAL", message="ZIP entry contains null bytes.")

            if ":" in fname or fname.startswith(("/", "\\")):
                raise IngestionError(code="PATH_TRAVERSAL", message=f"ZIP entry '{fname}' contains absolute path traversal risk.")

            dest_path = (resolved_target / fname).resolve()

            try:
                if not dest_path.is_relative_to(resolved_target):
                    raise IngestionError(code="PATH_TRAVERSAL", message=f"ZIP Slip path traversal detected in entry '{fname}'.")
            except AttributeError:
                if not str(dest_path).startswith(str(resolved_target)):
                    raise IngestionError(code="PATH_TRAVERSAL", message=f"ZIP Slip path traversal detected in entry '{fname}'.")

            if zinfo.is_dir():
                dest_path.mkdir(parents=True, exist_ok=True)
                continue

            dest_path.parent.mkdir(parents=True, exist_ok=True)

            with zf.open(zinfo) as src, open(dest_path, "wb") as dst:
                shutil.copyfileobj(src, dst)
