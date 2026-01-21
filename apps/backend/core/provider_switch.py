"""
Provider Switch Manager
=======================

Manages provider switch requests during spec creation.
When iFlow provider needs human input tools (only available in Claude),
this manager requests user confirmation before switching.
"""

import json
import time
from pathlib import Path
from datetime import datetime
from typing import Literal

from debug import debug, debug_detailed


class ProviderSwitchRequest:
    """Represents a provider switch request."""

    def __init__(
        self,
        current_provider: str,
        target_provider: str,
        reason: str,
        reason_code: str,
        task_description: str | None = None,
    ):
        self.id = f"switch-{datetime.now().strftime('%H%M%S')}"
        self.created_at = datetime.now().isoformat()
        self.status: Literal["pending", "approved", "rejected", "timeout"] = "pending"
        self.current_provider = current_provider
        self.target_provider = target_provider
        self.reason = reason
        self.reason_code = reason_code
        self.task_description = task_description
        self.user_choice: str | None = None
        self.answered_at: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "created_at": self.created_at,
            "status": self.status,
            "current_provider": self.current_provider,
            "target_provider": self.target_provider,
            "reason": self.reason,
            "reason_code": self.reason_code,
            "task_description": self.task_description,
            "user_choice": self.user_choice,
            "answered_at": self.answered_at,
            "timeout_seconds": 300,
        }


class ProviderSwitchManager:
    """Manages provider switch confirmation requests."""

    SWITCH_FILE = "provider_switch.json"

    # Reason codes for different switch triggers
    REASON_INVESTIGATION_TASK = "investigation_task"
    REASON_LOW_CONFIDENCE = "low_confidence"
    REASON_HUMAN_INPUT_NEEDED = "human_input_needed"

    def __init__(self, spec_dir: Path):
        self.spec_dir = spec_dir
        self.switch_file = spec_dir / self.SWITCH_FILE

    def request_switch(
        self,
        current_provider: str,
        target_provider: str,
        reason: str,
        reason_code: str,
        task_description: str | None = None,
        timeout: int = 300,
    ) -> tuple[bool, str | None]:
        """
        Request user confirmation for provider switch.

        Args:
            current_provider: Current provider (e.g., "iflow")
            target_provider: Target provider (e.g., "claude")
            reason: Human-readable reason for the switch
            reason_code: Machine-readable reason code
            task_description: Optional task description for context
            timeout: Timeout in seconds

        Returns:
            Tuple of (approved, user_choice)
            - approved: True if user approved switch, False otherwise
            - user_choice: "switch" | "skip" | None (if timeout/error)
        """
        request = ProviderSwitchRequest(
            current_provider=current_provider,
            target_provider=target_provider,
            reason=reason,
            reason_code=reason_code,
            task_description=task_description,
        )

        debug(
            "provider_switch",
            f"Requesting provider switch confirmation: {current_provider} -> {target_provider}",
            reason=reason,
            reason_code=reason_code,
        )

        # Write request to file
        self._write_request(request)

        # Wait for response
        result = self._wait_for_response(timeout)

        if result is None:
            debug("provider_switch", "Switch request timed out")
            self._update_status("timeout")
            return False, None

        approved = result.get("user_choice") == "switch"
        user_choice = result.get("user_choice")

        debug(
            "provider_switch",
            f"Switch request result: approved={approved}, choice={user_choice}",
        )

        return approved, user_choice

    def _write_request(self, request: ProviderSwitchRequest):
        """Write switch request to file."""
        self.spec_dir.mkdir(parents=True, exist_ok=True)
        with open(self.switch_file, "w", encoding="utf-8") as f:
            json.dump(request.to_dict(), f, indent=2, ensure_ascii=False)

    def _read_request(self) -> dict | None:
        """Read current request from file."""
        if not self.switch_file.exists():
            return None
        try:
            with open(self.switch_file, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None

    def _update_status(self, status: str):
        """Update request status."""
        data = self._read_request()
        if data:
            data["status"] = status
            data["answered_at"] = datetime.now().isoformat()
            with open(self.switch_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    def _wait_for_response(self, timeout: int) -> dict | None:
        """Poll for user response with timeout."""
        start = time.time()
        while time.time() - start < timeout:
            data = self._read_request()
            if data and data.get("status") in ("approved", "rejected"):
                return data
            time.sleep(1)
        return None

    def cleanup(self):
        """Remove the switch request file."""
        if self.switch_file.exists():
            self.switch_file.unlink()


def get_switch_reason_message(reason_code: str, task_description: str | None = None) -> str:
    """
    Get human-readable reason message for provider switch.

    Args:
        reason_code: Machine-readable reason code
        task_description: Optional task description

    Returns:
        Human-readable reason message
    """
    reasons = {
        ProviderSwitchManager.REASON_INVESTIGATION_TASK: (
            "This appears to be an investigation/exploration task that may require "
            "interactive questions. Human input tools are only available with Claude provider."
        ),
        ProviderSwitchManager.REASON_LOW_CONFIDENCE: (
            "The complexity assessment has low confidence. Switching to Claude will allow "
            "the agent to ask clarifying questions to better understand the task."
        ),
        ProviderSwitchManager.REASON_HUMAN_INPUT_NEEDED: (
            "This task requires human input during execution. "
            "Human input tools are only available with Claude provider."
        ),
    }

    base_reason = reasons.get(reason_code, "Human input tools are required for this task.")

    if task_description:
        return f"{base_reason}\n\nTask: {task_description[:200]}..."

    return base_reason
