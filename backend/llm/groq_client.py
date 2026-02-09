"""
Groq API client wrapper for LLM-powered features.
"""

import os
import json
import re
from typing import List, Dict, Any, Optional
from groq import Groq
from utils.logger import logger

# Default to environment variable, fallback to hardcoded for development
GROQ_API_KEY = os.environ.get(
    "GROQ_API_KEY",
    ""
)


class GroqService:
    """Wrapper for Groq API with error handling and response parsing."""

    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)
        self.default_model = "llama-3.3-70b-versatile"
        self.fast_model = "llama-3.1-8b-instant"

    def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """
        Send a chat completion request to Groq.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to llama-3.3-70b-versatile)
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            The assistant's response text
        """
        try:
            completion = self.client.chat.completions.create(
                model=model or self.default_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            response = completion.choices[0].message.content
            logger.info(f"Groq response received ({len(response)} chars)")
            return response

        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise

    def chat_json(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        """
        Send a chat request and parse JSON from the response.

        Args:
            messages: List of message dicts
            model: Model to use
            temperature: Lower temperature for more deterministic JSON

        Returns:
            Parsed JSON dictionary
        """
        # Add JSON instruction to the last message if not present
        messages = messages.copy()
        if "json" not in messages[-1]["content"].lower():
            messages[-1]["content"] += "\n\nRespond with valid JSON only."

        response = self.chat(messages, model, temperature)
        return self._extract_json(response)

    def _fix_json_newlines(self, text: str) -> str:
        """Escape literal newlines/tabs inside JSON string values.

        LLMs often produce JSON with real newline characters inside strings
        (e.g. multi-line code). JSON requires \\n instead of actual newlines
        inside string values. This fixes that while preserving whitespace
        between JSON properties.
        """
        result = []
        in_string = False
        i = 0
        while i < len(text):
            ch = text[i]
            # Handle escape sequences inside strings
            if in_string and ch == '\\':
                result.append(ch)
                if i + 1 < len(text):
                    i += 1
                    result.append(text[i])
                i += 1
                continue
            # Toggle string state on unescaped quote
            if ch == '"':
                in_string = not in_string
                result.append(ch)
                i += 1
                continue
            # Fix literal newlines/tabs inside strings
            if in_string:
                if ch == '\n':
                    result.append('\\n')
                elif ch == '\r':
                    result.append('\\r')
                elif ch == '\t':
                    result.append('\\t')
                else:
                    result.append(ch)
            else:
                result.append(ch)
            i += 1
        return ''.join(result)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response text."""
        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try to find JSON in code blocks
        code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if code_block_match:
            json_text = code_block_match.group(1)
            try:
                return json.loads(json_text)
            except json.JSONDecodeError:
                pass
            # Try fixing newlines inside strings
            try:
                return json.loads(self._fix_json_newlines(json_text))
            except json.JSONDecodeError:
                pass

        # Try to find JSON object pattern (greedy -- outermost braces)
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            json_text = json_match.group()
            try:
                return json.loads(json_text)
            except json.JSONDecodeError:
                pass
            # Try fixing newlines inside strings
            try:
                return json.loads(self._fix_json_newlines(json_text))
            except json.JSONDecodeError:
                pass

        # Return error structure if parsing fails
        logger.warning(f"Failed to parse JSON from LLM response ({len(text)} chars)")
        return {"error": "Failed to parse response", "raw": text[:500]}

    def analyze_data(
        self,
        data_summary: Dict[str, Any],
        task: str = "eda"
    ) -> Dict[str, Any]:
        """
        Analyze data using LLM for EDA insights.

        Args:
            data_summary: Dictionary with column stats, types, etc.
            task: Type of analysis ('eda', 'features', 'model')

        Returns:
            Analysis results as dictionary
        """
        from .prompts import get_eda_prompt, get_feature_prompt, get_model_prompt

        if task == "eda":
            system_prompt, user_prompt = get_eda_prompt(data_summary)
        elif task == "features":
            system_prompt, user_prompt = get_feature_prompt(data_summary)
        elif task == "model":
            system_prompt, user_prompt = get_model_prompt(data_summary)
        else:
            raise ValueError(f"Unknown task: {task}")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        return self.chat_json(messages)

    def generate_pipeline_suggestion(
        self,
        user_message: str,
        current_pipeline: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate pipeline suggestions based on user's natural language request.

        Args:
            user_message: User's description of what they want to do
            current_pipeline: Current pipeline state (nodes, edges)

        Returns:
            Suggested pipeline configuration
        """
        from .prompts import get_pipeline_prompt

        system_prompt, user_prompt = get_pipeline_prompt(user_message, current_pipeline)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        return self.chat_json(messages)


# Singleton instance
groq_service = GroqService()
